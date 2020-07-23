// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2020 The Board of Trustees of the Leland Stanford Junior University
//
// Redistribution and use in source and binary forms, with or
// without modification, are permitted provided that the following
// conditions are met:
//
// 1. Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above
//    copyright notice, this list of conditions and the following
//    disclaimer in the documentation and/or other materials
//    provided with the distribution.
// 3. Neither the name of the copyright holder nor the names of its
//    contributors may be used to endorse or promote products derived
//    from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
// INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
// SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
// HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
// STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED
// OF THE POSSIBILITY OF SUCH DAMAGE.
"use strict";

const assert = require('assert');
const stream = require('stream');
const path = require('path');
const fs = require('fs');
const pfs = require('fs').promises;
const seedrandom = require('seedrandom');

const Genie = require('genie-toolkit');
const Tp = require('thingpedia');
const ThingTalk = require('thingtalk');

const StreamUtils = require('./lib/stream_utils');
const Platform = require('./lib/platform');
const { readAllLines } = require('./lib/argutils');
const { coin } = require('./lib/random');
const toDialogueState = require('./lib/program-to-dialogue-state');

const FEW_SHOT_TRAIN_PROBABILITY = 0.3;

// must be in inheritance order
const RELEASES = ['builtin', 'main', 'universe', 'staging'];

async function existsSafe(path) {
    try {
        await pfs.access(path, fs.constants.F_OK);
        return true;
    } catch(e) {
        if (e.code === 'ENOENT')
            return false;
        if (e.code === 'ENOTDIR')
            return false;
        throw e;
    }
}



class Processor extends stream.Writable {
    constructor(schemas, rng) {
        super({ objectMode: true });

        this._existingDataset = new Set;
        this._devices = new Map;
        this._outputs = new Map;
        this._schemas = schemas;
        this._idQueries = new Map;

        this._langPack = Genie.I18n.get('en-US');
        this._rng = rng;
    }

    async _tryLoadExistingDataset(filename) {
        if (!await existsSafe(filename))
            return;

        const existingDataset = this._existingDataset;
        await StreamUtils.waitFinish(readAllLines([filename])
            .pipe(new Genie.DialogueParser())
            .pipe(new stream.Writable({
                objectMode: true,

                write(ex, encoding, callback) {
                    existingDataset.add(ex.id);
                    callback();
                }
            })));
    }

    async init() {
        // load all existing datasets
        for (const r of RELEASES) {
            await this._tryLoadExistingDataset(path.resolve('eval', r, 'dev/annotated.txt'));
            await this._tryLoadExistingDataset(path.resolve('eval', r, 'train/annotated.txt'));

            for (const d of await pfs.readdir(path.resolve(r))) {
                if (!await existsSafe(path.resolve(r, d, 'manifest.tt')))
                    continue;
                assert(!this._devices.has(d));

                this._devices.set(d, r);

                await this._tryLoadExistingDataset(path.resolve(r, d, 'eval/dev/annotated.txt'));
                await this._tryLoadExistingDataset(path.resolve(r, d, 'eval/train/annotated.txt'));

                try {
                    const classDef = await this._schemas.getFullMeta(d);
                    for (let queryname in classDef.queries) {
                        const query = classDef.queries[queryname];
                        const functionName = classDef.kind + ':' + query.name;
                        if (query.is_list && query.hasArgument('id')) {
                            const idarg = query.getArgument('id');
                            if (idarg.type.isEntity && idarg.type.type === functionName)
                                this._idQueries.set(functionName, query);
                        }
                    }
                } catch(e) {
                    console.error(`Failed to load manifest for ${d}: ${e.message}`);
                }
            }
        }
    }

    _write(ex, encoding, callback) {
        this._process(ex).then(() => {
            callback();
        }, (e) => {
            console.error(`Failed to process ${ex.id}: ${e.message}`);
            callback();
        });
    }

    _final(callback) {
        for (let [f1, f2] of this._outputs.values()) {
            f1.end();
            f2.end();
        }
        callback();
    }

    async _getFile(device) {
        assert(typeof device === 'string');
        if (this._outputs.has(device))
            return this._outputs.get(device);

        if (RELEASES.indexOf(device) >= 0) {
            const release = device;
            await pfs.mkdir(path.resolve('eval', release, 'dev'), { recursive: true });
            await pfs.mkdir(path.resolve('eval', release, 'train'), { recursive: true });

            const dev = new Genie.DialogueSerializer();
            dev.pipe(fs.createWriteStream(path.resolve('eval', release, 'dev/annotated.txt'), { flags: 'a' }));
            const train = new Genie.DialogueSerializer();
            train.pipe(fs.createWriteStream(path.resolve('eval',  release, 'train/annotated.txt'), { flags: 'a' }));

            this._outputs.set(device, [dev, train]);
            return [dev, train];
        } else {
            const release = this._devices.get(device);
            if (!release)
                throw new Error(`Cannot find device ${device} in repo`);

            await pfs.mkdir(path.resolve(release, device, 'eval/dev'), { recursive: true });
            await pfs.mkdir(path.resolve(release, device, 'eval/train'), { recursive: true });

            const dev = new Genie.DialogueSerializer();
            dev.pipe(fs.createWriteStream(path.resolve(release, device, 'eval/dev/annotated.txt'), { flags: 'a' }));
            const train = new Genie.DialogueSerializer();
            train.pipe(fs.createWriteStream(path.resolve(release, device, 'eval/train/annotated.txt'), { flags: 'a' }));

            this._outputs.set(device, [dev, train]);
            return [dev, train];
        }
    }

    _detokenize(preprocessed, entities) {
        let output = '';
        let prevToken;
        for (let token of preprocessed.split(' ')) {
            if (token in entities) {
                if (token.startsWith('GENERIC_ENTITY_'))
                    token = (entities[token].display || entities[token].value);
                else if (token.startsWith('DATE_'))
                    token = entities[token].month + '/' + entities[token].day + '/' + entities[token].year;
                else if (token.startsWith('TIME_'))
                    token = entities[token].hour + ':' + entities[token].minute;
                else if (token.startsWith('MEASURE_') || token.startsWith('DURATION_'))
                    token = entities[token].value + ' ' + entities[token].unit;
                else if (token.startsWith('CURRENCY_'))
                    token = '$' + entities[token].value;
                else if (token.startsWith('LOCATION_'))
                    token = entities[token].display;
                else if (token.startsWith('QUOTED_STRING_'))
                    token = '"' + entities[token] + '"';
                else
                    token = String(entities[token]);
            }

            output = this._langPack.detokenize(output, prevToken, token);
            prevToken = token;
        }

        return output;
    }

    _getDevice(dialogueState) {
        const devices = new Set;
        dialogueState.visit(new class extends ThingTalk.Ast.NodeVisitor {
            visitDeviceSelector(sel) {
                devices.add(sel.kind);
                return true;
            }
            visitExternalBooleanExpression(expr) {
                devices.add(expr.kind);
                return true;
            }
        });

        if (devices.size === 1)
            return Array.from(devices)[0];

        // find the largest release that contains all the devices
        // we'll add this training sample to the multiskill dev/train sets for that release

        let rank = 0, release = 'builtin';
        for (let d of devices) {
            const drelease = this._devices.get(d);
            if (!drelease)
                throw new Error(`Cannot find device ${d} in repo`);
            const drank = RELEASES.indexOf(drelease);
            assert(drank >= 0);
            if (drank > rank) {
                rank = drank;
                release = drelease;
            }
        }
        return release;
    }

    async _process(ex) {
        if (this._existingDataset.has('online/' + ex.id))
            return;

        const entities = Genie.EntityUtils.makeDummyEntities(ex.preprocessed);
        const program = ThingTalk.NNSyntax.fromNN(ex.target_code.split(' '), entities);
        await program.typecheck(this._schemas, false);

        const dialoguestate = toDialogueState(program, this._idQueries);
        if (typeof dialoguestate === 'string') {
            console.log(`Ignored example ${ex.id}: ${dialoguestate}`);
            return;
        }
        const device = this._getDevice(dialoguestate);

        const [dev, train] = await this._getFile(device);
        const out = coin(FEW_SHOT_TRAIN_PROBABILITY, this._rng) ? train : dev;

        const utterance = this._detokenize(ex.preprocessed, entities);
        const code = dialoguestate.prettyprint();

        out.write({
            id: 'online/' + ex.id,
            turns: [{
                context: '',
                agent: '',
                agent_target: '',
                user: utterance,
                user_target: code
            }]
        });
    }
}



async function main() {
    const platform = new Platform();
    platform.getSharedPreferences().set('developer-dir', RELEASES.map((r) => path.resolve(r)));

    const tpClient = new Tp.HttpClient(platform, 'https://almond-dev.stanford.edu/thingpedia');
    const schemas = new ThingTalk.SchemaRetriever(tpClient, null, false);

    const input = readAllLines(process.argv.slice(2));
    const rng = seedrandom.alea('almond is awesome');
    const processor = new Processor(schemas, rng);
    await processor.init();

    const out = input
        .pipe(new Genie.DatasetParser())
        .pipe(processor);

    await StreamUtils.waitFinish(out);
}
main();
