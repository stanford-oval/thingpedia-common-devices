// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Genie
//
// Copyright 2019-2020 The Board of Trustees of the Leland Stanford Junior University
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
"use strict";

const assert = require('assert');
const crypto = require('crypto');
const argparse = require('argparse');
const byline = require('byline');
const fs = require('fs');
const { promises: pfs } = require('fs');
const path = require('path');
const csvparse = require('csv-parse');
const csvstringify = require('csv-stringify');
const readline = require('readline');
const Tp = require('thingpedia');
const ThingTalk = require('thingtalk');
const Genie = require('genie-toolkit');
const { ParserClient, ThingTalkUtils } = Genie;

//const StreamUtils = require('./lib/stream_utils');
const Platform = require('./lib/platform');
const { readAllLines } = require('./lib/argutils');
const { coin } = require('./lib/random');

const FEW_SHOT_TRAIN_PROBABILITY = 0.3;

// must be in inheritance order
const RELEASES = ['builtin', 'main', 'universe', 'staging'];

class GetDevicesVisitor extends ThingTalk.Ast.NodeVisitor {
    constructor() {
        super();
        this.devices = new Set;
    }

    visitDeviceSelector(sel) {
        this.devices.add(sel.kind);
        return true;
    }
    visitExternalBooleanExpression(expr) {
        this.devices.add(expr.kind);
        return true;
    }
}

class RemoveSensitiveInfoVisitor extends ThingTalk.Ast.NodeVisitor {
    visitDeviceSelector(sel) {
        if (sel.id === 'thingengine-own-global')
            sel.id = null;
        if (sel.id && sel.id !== sel.kind)
            sel.id = sel.kind + '-XXXXXXXX';
        sel.attributes = sel.attributes.filter((ip) => ip.name !== 'name');
        return true;
    }
    visitEntityValue(value) {
        if (value.type === 'com.spotify:device') {
            value.value = 'XXXXXXXX';
            value.display = null;
        }
    }
}

class Trainer {
    constructor(platform, tpClient, options) {
        this._rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        this._rl.setPrompt('$ ');
        this._rl.on('SIGINT', this._quit.bind(this));

        this._idPrefix = options.id_prefix;
        this._locale = options.locale;
        this._tpClient = tpClient;
        this._schemas = new ThingTalk.SchemaRetriever(this._tpClient, null, true);
        this._parser = ParserClient.get(options.model, options.locale, platform);

        this._langPack = Genie.I18n.get(options.locale);
        this._tokenizer = this._langPack.getTokenizer();

        this._droppedFilename = options.dropped;
        this._outputs = new Map;
        this._existingDataset = new Set;
        this._sentenceCache = new Map;

        this._dialogues = [];
        this._serial = -1;

        this._devices = new Map;
        this._idQueries = new Map;

        this._state = 'loading';
        this._turnIdx = 0;
        this._outputDialogue = [];
        this._outputTurn = undefined;
        this._candidates = undefined;
        this._utterance = undefined;
        this._comment = undefined;
        this._entities = undefined;
        this._id = undefined;

        this._rl.on('line', async (line) => {
            line = line.trim();
            if (line.length === 0 || this._state === 'loading') {
                this._rl.prompt();
                return;
            }

            if (line === 'h' || line === '?') {
                this._help();
                return;
            }

            if (line === 'd' || line.startsWith('d ')) {
                const comment = line.substring(2).trim();
                this._drop(comment);
                return;
            }

            if (this._state === 'code') {
                this._learnThingTalk(line);
                return;
            }

            if (Number.isFinite(parseInt(line))) {
                this._learnNumber(parseInt(line));
            } else if (line === 'n') {
                this._more();
            } else if (line.startsWith('e ')) {
                this._edit(parseInt(line.substring(2).trim()));
            } else if (line === 't') {
                this._state = 'code';
                this._rl.setPrompt('TT: ');
                this._rl.prompt();
            } else {
                //console.log('Invalid command');
                //rl.prompt();
                this._learnThingTalk(line).catch((e) => this.emit('error', e));
            }
        });
    }

    _help() {
        console.log('Available commands:');
        console.log(`$number : select from the candidates`);
        console.log(`e $number : edit the selected thingtalk code`);
        console.log(`n : show more candidates`);
        console.log(`t : type in the thingtalk directly`);
        console.log(`d $comment : drop the turn and truncate the dialogue, with the given reason`);

        this._rl.prompt();
    }

    async _tryLoadExistingDataset(filename) {
        if (!fs.existsSync(filename))
            return;
        for await (const dlg of readAllLines([filename]).pipe(new Genie.DialogueParser()))
            this._existingDataset.add(dlg.id);
    }

    async _loadAllExistingDatasets() {
        if (fs.existsSync(this._droppedFilename)) {
            for await (const row of fs.createReadStream(this._droppedFilename).pipe(csvparse({ delimiter: '\t' }))) {
                const [id,] = row;
                this._existingDataset.add(id);
            }
        }

        for (const r of RELEASES) {
            await this._tryLoadExistingDataset(path.resolve('eval', r, 'dev/annotated.txt'));
            await this._tryLoadExistingDataset(path.resolve('eval', r, 'train/annotated.txt'));

            for (const d of await pfs.readdir(path.resolve(r))) {
                if (!fs.existsSync(path.resolve(r, d, 'manifest.tt')))
                    continue;
                assert(!this._devices.has(d), `duplicate device ${d}`);

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

    async init() {
        await this._loadAllExistingDatasets();

        this._droppedOut = csvstringify({ delimiter: '\t' });
        this._droppedOut.pipe(fs.createWriteStream(this._droppedFilename, { flags: 'a' }));
        await this._parser.start();

        // load the dialogues to process
        for (const userId of await pfs.readdir('./logs/unsorted')) {
            for (const conversationId of await pfs.readdir(path.resolve('./logs/unsorted/', userId, 'logs'))) {
                const filepath = path.resolve('./logs/unsorted/', userId, 'logs', conversationId);
                try {
                    let i = 0;
                    for await (const dlg of fs.createReadStream(filepath, { encoding: 'utf8' }).pipe(byline()).pipe(new Genie.DialogueParser({ ignoreErrors: true }))) {
                        if (dlg.length === 0)
                            continue;
                        dlg.id = await this._computeId(userId, conversationId, i++);

                        const visitor = new RemoveSensitiveInfoVisitor();
                        for (const turn of dlg) {
                            if (turn.context) {
                                const parsed = ThingTalk.Syntax.parse(turn.context);
                                parsed.visit(visitor);
                                turn.context = parsed.prettyprint();
                            }
                            if (turn.agent_target) {
                                const parsed = ThingTalk.Syntax.parse(turn.agent_target);
                                parsed.visit(visitor);
                                turn.agent_target = parsed.prettyprint();
                            }
                            if (turn.user_target) {
                                const parsed = ThingTalk.Syntax.parse(turn.user_target);
                                parsed.visit(visitor);
                                turn.user_target = parsed.prettyprint();
                            }
                        }
                        this._dialogues.push(dlg);
                    }
                } catch(e) {
                    console.error(`Failed to process ${filepath}: ${e}`);
                }
            }
        }
    }

    async _quit() {
        this._rl.close();

        for (let [f1, f2] of this._outputs.values()) {
            f1.end();
            f2.end();
        }
        this._droppedOut.end();
        await this._parser.stop();
    }

    async _computeId(userId, conversationId, idx) {
        const hash = crypto.createHash('sha256');
        hash.update(userId + '-' + conversationId + '-' + idx);
        return 'recording/' + hash.digest('hex').substring(0, 32);
    }

    async _finishDialogue() {
        const device = this._getDevice();

        const [dev, train] = await this._getFile(device);
        const out = coin(FEW_SHOT_TRAIN_PROBABILITY, this._rng) ? train : dev;

        out.write({
            id: this._id,
            turns: this._outputDialogue
        });
    }

    async _drop(comment = '') {
        if (this._outputDialogue.length > 0)
            await this._finishDialogue();
        this._droppedOut.write([this._id, comment]);

        this.next();
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

    async _getFile(device) {
        assert(typeof device === 'string');
        if (this._outputs.has(device))
            return this._outputs.get(device);

        if (RELEASES.indexOf(device) >= 0) {
            const release = device;

            return this._getManualFile(device, path.resolve('eval', release));
        } else {
            const release = this._devices.get(device);
            if (!release)
                throw new Error(`Cannot find device ${device} in repo`);

            return this._getManualFile(device, path.resolve(release, device, 'eval'));
        }
    }

    _getDevice() {
        const visitor = new GetDevicesVisitor();
        for (const turn of this._outputDialogue) {
            if (turn.context) {
                const parsed = ThingTalk.Syntax.parse(turn.context);
                parsed.visit(visitor);
            }
            if (turn.agent_target) {
                const parsed = ThingTalk.Syntax.parse(turn.agent_target);
                parsed.visit(visitor);
            }
            const parsed = ThingTalk.Syntax.parse(turn.user_target);
            parsed.visit(visitor);
        }

        const devices = visitor.devices;
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

    async _learnProgram(prediction) {
        const newCode = prediction.prettyprint();
        if (newCode.trim() === this._outputTurn.user_target.trim()) {
            this._outputDialogue.push(this._outputTurn);
            this._turnIdx ++;
            if (this._turnIdx === this._dialogues[this._serial].length) {
                await this._finishDialogue();
                await this.next();
            } else {
                await this._nextTurn();
            }
            return;
        }

        let targetCode;
        try {
            targetCode = ThingTalkUtils.serializePrediction(prediction, this._preprocessed, this._entities, {
                locale: this._locale
            }).join(' ');
        } catch(e) {
            console.log(`${e.name}: ${e.message}`);
            this._rl.setPrompt('TT: ');
            this._rl.prompt();
            return;
        }
        console.log(`Learned: ${targetCode}`);
        this._outputTurn.user_target = newCode;
        this._outputDialogue.push(this._outputTurn);

        await this._finishDialogue();
        await this.next();
    }

    async _learnThingTalk(code) {
        let program;
        try {
            program = await ThingTalkUtils.parse(code, this._schemas);
        } catch(e) {
            console.log(`${e.name}: ${e.message}`);
            this._rl.setPrompt('TT: ');
            this._rl.prompt();
            return;
        }
        this._learnProgram(program);
    }

    _edit(i) {
        if (Number.isNaN(i) || i < 1 || i > this._candidates.length) {
            console.log('Invalid number');
            this._rl.setPrompt('$ ');
            this._rl.prompt();
            return;
        }
        i -= 1;
        const program = this._candidates[i];
        this._state = 'code';
        this._rl.setPrompt('TT: ');
        this._rl.write(program.prettyprint().replace(/\n/g, ' '));
        this._rl.prompt();
    }

    _learnNumber(i) {
        if (i < 1 || i > this._candidates.length) {
            console.log('Invalid number');
            this._rl.setPrompt('$ ');
            this._rl.prompt();
            return;
        }
        i -= 1;
        this._learnProgram(this._candidates[i]);
    }

    _more() {
        if (this._state === 'top3') {
            this._state = 'full';
            console.log(`Sentence #${this._serial+1} (${this._id}): ${this._utterance}`);
            const candidates = this._candidates;
            for (let i = 0; i < candidates.length; i++)
                console.log(`${i+1}) ${candidates[i].prettyprint()}`);
            this._rl.setPrompt('$ ');
            this._rl.prompt();
        } else {
            this._state = 'code';
            this._rl.setPrompt('TT: ');
            this._rl.prompt();
        }
    }

    async next() {
        this._serial++;

        if (this._serial >= this._dialogues.length) {
            await this._quit();
            return;
        }

        this._turnIdx = 0;
        this._id = this._dialogues[this._serial].id;

        if (this._existingDataset.has(this._id)) {
            await this.next();
            return;
        }

        console.log('====');
        console.log(`Dialogue #${this._serial} (${this._id})`);
        this._outputDialogue = [];
        await this._nextTurn();
    }

    async _nextTurn() {
        this._outputTurn = this._dialogues[this._serial][this._turnIdx];

        let contextCode = ['null'], contextEntities = {};

        if (this._outputTurn.user.startsWith('\\t')) {
            await this._drop('\\t');
            return;
        }

        if (this._outputTurn.context) {
            try {
                let context = await ThingTalkUtils.parse(this._outputTurn.context, {
                    thingpediaClient: this._tpClient,
                    schemaRetriever: this._schemas
                }, true);

                let agentTarget = await ThingTalkUtils.parse(this._outputTurn.agent_target, {
                    thingpediaClient: this._tpClient,
                    schemaRetriever: this._schemas
                }, true);

                context = ThingTalkUtils.computeNewState(context, agentTarget, 'agent');

                context = ThingTalkUtils.prepareContextForPrediction(context, 'user');
                [contextCode, contextEntities] = ThingTalkUtils.serializeNormalized(context);
            } catch(e) {
                console.log(`Turn ${this._id}/${this._turnIdx}'s existing context is incorrect: ${e}`); //'
                await this._drop('no-typecheck');
                return;
            }

            for (const line of this._outputTurn.context.trim().split('\n'))
                console.log('C: ' + line);
            console.log('A: ' + this._outputTurn.agent);
        }

        const parsed = await this._parser.sendUtterance(this._outputTurn.user, contextCode, contextEntities, {
            tokenized: false,
            skip_typechecking: true
        });

        this._preprocessed = parsed.tokens;
        this._entities = parsed.entities;

        let olddialoguestate;
        try {
            olddialoguestate = await ThingTalkUtils.parse(this._outputTurn.user_target, {
                thingpediaClient: this._tpClient,
                schemaRetriever: this._schemas
            }, true);

            if (olddialoguestate instanceof ThingTalk.Ast.Program) {
                const history = olddialoguestate.statements.map((stmt) => new ThingTalk.Ast.DialogueHistoryItem(null, stmt, null, 'accepted'));
                olddialoguestate = new ThingTalk.Ast.DialogueState(null, 'org.thingpedia.dialogue.transaction', 'execute', null, history);
                this._outputTurn.user_target = olddialoguestate.prettyprint();
            }
        } catch(e) {
            console.log(`Turn ${this._id}/${this._turnIdx}'s existing user target is incorrect: ${e}`); //'
        }

        this._state = 'top3';

        const candidates = await ThingTalkUtils.parseAllPredictions(parsed.candidates, parsed.entities, {
            thingpediaClient: this._tpClient,
            schemaRetriever: this._schemas
        });
        this._candidates = candidates;
        if (olddialoguestate)
            this._candidates.unshift(olddialoguestate);

        console.log(`U: ${this._outputTurn.user}`);
        for (let i = 0; i < 3 && i < this._candidates.length; i++)
            console.log(`${i+1}) ${this._candidates[i].prettyprint()}`);
        this._rl.setPrompt('$ ');
        this._rl.prompt();
    }
}

async function main() {
    const parser = new argparse.ArgumentParser({
        add_help: true,
        description: `Import and manually annotate the Almond logs.`
    });
    parser.add_argument('--dropped', {
        required: false,
        default: './logs/dropped.tsv',
    });
    parser.add_argument('-l', '--locale', {
        required: false,
        default: 'en-US',
        help: `BGP 47 locale tag of the natural language being processed (defaults to en-US).`
    });
    parser.add_argument('--model', {
        required: false,
        //default: 'file://' + path.resolve(path.dirname(module.filename), '../tmp/model'),
        default: 'https://nlp-staging.almond.stanford.edu',
        help: `The URL of the natural language model.`
    });

    const args = parser.parse_args();

    const platform = new Platform();
    platform.getSharedPreferences().set('developer-dir', RELEASES.map((r) => path.resolve(r)));

    const tpClient = new Tp.HttpClient(platform, 'https://dev.almond.stanford.edu/thingpedia');

    const trainer = new Trainer(platform, tpClient, args);
    await trainer.init();

    trainer.next();
}
main();
