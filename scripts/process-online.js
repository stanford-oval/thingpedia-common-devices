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
const argparse = require('argparse');

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

const DEVICES_REMAP = {
    'light-bulb': 'org.thingpedia.iot.light-bulb',
    'security-camera': 'org.thingpedia.iot.security-camera',
    'thermostat': 'org.thingpedia.iot.thermostat'
};

class Processor extends stream.Writable {
    constructor(type, prefix, schemas, droppedFilename, rng) {
        super({ objectMode: true });

        this._type = type;
        this._prefix = prefix;

        this._droppedFilename = droppedFilename;
        this._existingDataset = new Set;
        this._dropped = new Set;
        this._deduplicate = new Set;

        this._devices = new Map;
        this._outputs = new Map;
        this._schemas = schemas;
        this._idQueries = new Map;

        this._langPack = Genie.I18n.get('en-US');
        this._rng = rng;
    }

    async _tryLoadExistingDataset(filename) {
        //if (!await existsSafe(filename))
        //    return;

        const existingDataset = this._existingDataset;

        if (this._droppedFilename) {
            for await (let line of readAllLines([this._droppedFilename])) {
                line = line.trim();
                if (!line || line.startsWith('#'))
                    continue;
                this._dropped.add(line);
            }
        }

        await StreamUtils.waitFinish(readAllLines([filename])
            .pipe(this._type === 'manual' ? new Genie.DialogueParser() : new Genie.DatasetParser())
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
            if (this._type === 'manual') {
                await this._tryLoadExistingDataset(path.resolve('eval', r, 'dev/annotated.txt'));
                await this._tryLoadExistingDataset(path.resolve('eval', r, 'train/annotated.txt'));
            } else {
                await this._tryLoadExistingDataset(path.resolve('eval', r, 'paraphrase.tsv'));
            }

            for (const d of await pfs.readdir(path.resolve(r))) {
                if (!await existsSafe(path.resolve(r, d, 'manifest.tt')))
                    continue;
                assert(!this._devices.has(d));

                this._devices.set(d, r);

                if (this._type === 'manual') {
                    await this._tryLoadExistingDataset(path.resolve(r, d, 'eval/dev/annotated.txt'));
                    await this._tryLoadExistingDataset(path.resolve(r, d, 'eval/train/annotated.txt'));
                } else {
                    await this._tryLoadExistingDataset(path.resolve(r, d, 'eval/paraphrase.tsv'));
                }

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
        if (this._type === 'manual') {
            for (let [f1, f2] of this._outputs.values()) {
                f1.end();
                f2.end();
            }
        } else {
            for (let f of this._outputs.values())
                f.end();
        }
        callback();
    }

    async _getManualFile(key, directory) {
        await pfs.mkdir(path.resolve(directory, 'dev'), { recursive: true });
        await pfs.mkdir(path.resolve(directory, 'train'), { recursive: true });

        const dev = new Genie.DialogueSerializer();
        dev.pipe(fs.createWriteStream(path.resolve(directory, 'dev/annotated.txt'), { flags: 'a' }));
        const train = new Genie.DialogueSerializer();
        train.pipe(fs.createWriteStream(path.resolve(directory, 'train/annotated.txt'), { flags: 'a' }));

        this._outputs.set(key, [dev, train]);
        return [dev, train];
    }

    async _getParaphraseFile(key, directory) {
        await pfs.mkdir(path.resolve(directory), { recursive: true });

        const out = new Genie.DatasetStringifier();
        out.pipe(fs.createWriteStream(path.resolve(directory, 'paraphrase.tsv'), { flags: 'a' }));

        this._outputs.set(key, out);
        return out;
    }

    async _getFile(device) {
        assert(typeof device === 'string');
        if (this._outputs.has(device))
            return this._outputs.get(device);

        if (RELEASES.indexOf(device) >= 0) {
            const release = device;

            if (this._type === 'manual')
                return this._getManualFile(device, path.resolve('eval', release));
            else
                return this._getParaphraseFile(device, path.resolve('eval', release));
        } else {
            const release = this._devices.get(device);
            if (!release)
                throw new Error(`Cannot find device ${device} in repo`);

            if (this._type === 'manual')
                return this._getManualFile(device, path.resolve(release, device, 'eval'));
            else
                return this._getParaphraseFile(device, path.resolve(release, device, 'eval'));
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

    _adjustDevices(dialogueState) {
        dialogueState.visit(new class extends ThingTalk.Ast.NodeVisitor {
            visitDeviceSelector(sel) {
                if (sel.kind in DEVICES_REMAP)
                    sel.kind = DEVICES_REMAP[sel.kind];
                return true;
            }
            visitExternalBooleanExpression(expr) {
                if (expr.kind in DEVICES_REMAP)
                    expr.kind = DEVICES_REMAP[expr.kind];
                return true;
            }
        });
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
        if (this._deduplicate.has(ex.preprocessed))
            return;
        this._deduplicate.add(ex.preprocessed);

        if (this._existingDataset.has(this._prefix + ex.id) || this._dropped.has(this._prefix + ex.id))
            return;

        const entities = Genie.EntityUtils.makeDummyEntities(ex.preprocessed);
        const program = await Genie.ThingTalkUtils.parsePrediction(ex.target_code, entities, {
            schemaRetriever: this._schemas,
            loadMetadata: false,
        }, true);

        const dialoguestate = toDialogueState(program, this._idQueries);
        if (typeof dialoguestate === 'string') {
            console.log(`Ignored example ${ex.id}: ${dialoguestate}`);
            return;
        }
        this._adjustDevices(dialoguestate);

        const device = this._getDevice(dialoguestate);

        let out;
        if (this._type === 'manual') {
            const [dev, train] = await this._getFile(device);
            out = coin(FEW_SHOT_TRAIN_PROBABILITY, this._rng) ? train : dev;

            const utterance = this._detokenize(ex.preprocessed, entities);
            const code = dialoguestate.prettyprint();

            out.write({
                id: this._prefix + ex.id,
                turns: [{
                    context: '',
                    agent: '',
                    agent_target: '',
                    user: utterance,
                    user_target: code
                }]
            });
        } else {
            out = await this._getFile(device);

            const code = Genie.ThingTalkUtils.serializePrediction(dialoguestate, ex.preprocessed, entities, { locale: 'en-US' }).join(' ');
            out.write({
                id: this._prefix + ex.id,
                context: 'null',
                preprocessed: ex.preprocessed,
                target_code: code
            });
        }
    }
}



async function main() {
    const parser = new argparse.ArgumentParser({
        add_help: true,
        description: "Import a single-sentence paraphrase or manually annotated dataset."
    });
    parser.add_argument(['-t', '--type'], {
        default: 'manual',
        required: false,
        help: 'Type of dataset to import',
        choices: ['paraphrase', 'manual']
    });
    parser.add_argument('--prefix', {
        required: false,
        help: 'Prefix to add to IDs (defaults to "online" for manual datasets, and "turking" for paraphrase datasets)',
    });
    parser.add_argument('--dropped', {
        required: false,
        help: 'Path to text file containing IDs of sentences to ignore (one per line)',
    });
    parser.add_argument('--random-seed', {
        default: 'almond is awesome',
        required: false,
    });
    parser.add_argument('input_file', {
        nargs: '+',
        help: 'Input files to process. Use - for standard input.'
    });
    const args = parser.parse_args();
    const prefix = (args.prefix || (args.type === 'manual' ? 'online' : 'turking')) + '/';

    const platform = new Platform();
    platform.getSharedPreferences().set('developer-dir', RELEASES.map((r) => path.resolve(r)));

    const tpClient = new Tp.HttpClient(platform, 'https://almond-dev.stanford.edu/thingpedia');
    const schemas = new ThingTalk.SchemaRetriever(tpClient, null, false);

    const input = readAllLines(args.input_file);
    const rng = seedrandom.alea(args.random_seed);
    const processor = new Processor(args.type, prefix, schemas, args.dropped, rng);
    await processor.init();

    const out = input
        .pipe(new Genie.DatasetParser())
        .pipe(processor);

    await StreamUtils.waitFinish(out);
}
main();
