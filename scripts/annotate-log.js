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
const argparse = require('argparse');
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

const StreamUtils = require('./lib/stream_utils');
const Platform = require('./lib/platform');
const { readAllLines } = require('./lib/argutils');
const { coin } = require('./lib/random');
const toDialogueState = require('./lib/program-to-dialogue-state');

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

const FEW_SHOT_TRAIN_PROBABILITY = 0.3;

// must be in inheritance order
const RELEASES = ['builtin', 'main', 'universe', 'staging'];

const SHORTHAND_COMMENT = {
    'j': 'junk',
    'm': 'meta-command',
    'c': 'contextual command',
    'ch': 'chatty',
    'fl': 'foreign language',
    'bt': 'bug-tokenize',
    'nf': 'new function',
    'nd': 'new device',
    's': 'stream',
    'r': 'policy or remote program',
    'a': 'ambiguous',
    'u': 'unintellegible',
    'w': 'web search',
    'q': 'question',
};

const DEVICES_REMAP = {
    'light-bulb': 'org.thingpedia.iot.light-bulb',
    'security-camera': 'org.thingpedia.iot.security-camera',
    'thermostat': 'org.thingpedia.iot.thermostat'
};

const LEGACY_TOKEN_MAP = {
    // legacy PTB tokens: [L]eft/[R]ight [R]ound/[C]urly/[S]quare [B]racket
    '-lcb-': '{',
    '-rcb-': '}',
    '-lrb-': '(',
    '-rrb-': ')',
    '-lsb-': '[',
    '-rsb-': ']',
    '``': '"',
    "''": '"',
};

class Trainer {
    constructor(lines, platform, tpClient, options) {
        this._rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        this._rl.setPrompt('$ ');
        this._rl.on('SIGINT', this._quit.bind(this));

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
        this._editExisting = options.edit_existing;

        this._devices = new Map;
        this._idQueries = new Map;

        this._nextLine = lines[Symbol.iterator]();

        this._state = 'loading';
        this._candidates = undefined;
        this._utterance = undefined;
        this._preprocessed = undefined;
        this._comment = undefined;
        this._entities = undefined;
        this._serial = -1;
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
                let comment = line.substring(2).trim();
                if (!comment && this._comment)
                    comment = this._comment;
                comment = SHORTHAND_COMMENT[comment] || comment;
                this._drop(comment);
                return;
            }

            if (line === 'es') {
                this._state = 'edit-sentence';
                this._rl.setPrompt('U: ');
                this._rl.write(this._utterance.replace(/\n/g, ' '));
                this._rl.prompt();
                return;
            }

            if (this._state === 'edit-sentence') {
                this._handleCustomSentence(line);
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
        console.log(`es : edit the sentence`);
        console.log(`n : show more candidates`);
        console.log(`t : type in the thingtalk directly`);
        console.log(`d $comment : drop the example, with the given reason`);
        console.log(`d redacted : drop the example, and hide the sentence from the dropped log`);
        for (const key in SHORTHAND_COMMENT)
            console.log(`d ${key} : drop the example as ${SHORTHAND_COMMENT[key]}`);

        this._rl.prompt();
    }

    async _tryLoadExistingDataset(filename) {
        //if (!await existsSafe(filename))
        //    return;
        for await (const dlg of readAllLines([filename]).pipe(new Genie.DialogueParser())) {
            this._existingDataset.add(dlg.id);
            try {
                const turn0 = dlg[0];
                const preprocessed = this._tokenizer.tokenize(turn0.user);
                const program = await ThingTalkUtils.parse(turn0.user_target, this._schemas);
                const targetCode = ThingTalkUtils.serializePrediction(program, preprocessed.tokens, preprocessed.entities, {
                    locale: this._locale
                }).join(' ');

                this._sentenceCache.set(preprocessed.tokens.join(' '), { parsed: targetCode });
            } catch(e) {
                console.error(`Failed to load existing example ${dlg.id} in ${filename}: ${e.message}`);
            }
        }
    }

    async _loadAllExistingDatasets() {
        if (fs.existsSync(this._droppedFilename)) {
            for await (const row of fs.createReadStream(this._droppedFilename).pipe(csvparse({ delimiter: '\t' }))) {
                const [id, sentence, comment] = row;
                this._existingDataset.add(id);

                if (sentence !== '<redacted>')
                    this._sentenceCache.set(sentence, { dropped: comment });
            }
        }

        for (const r of RELEASES) {
            await this._tryLoadExistingDataset(path.resolve('eval', r, 'dev/annotated.txt'));
            await this._tryLoadExistingDataset(path.resolve('eval', r, 'train/annotated.txt'));

            for (const d of await pfs.readdir(path.resolve(r))) {
                if (!await existsSafe(path.resolve(r, d, 'manifest.tt')))
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

    _drop(comment = '') {
        if (comment === 'redacted') {
            this._droppedOut.write([this._id, '<redacted>', comment]);
        } else {
            this._sentenceCache.set(this._preprocessed, { dropped: comment });
            this._droppedOut.write([this._id, this._preprocessed, comment]);
        }

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

            return this._getManualFile(device, path.resolve('eval', release));
        } else {
            const release = this._devices.get(device);
            if (!release)
                throw new Error(`Cannot find device ${device} in repo`);

            return this._getManualFile(device, path.resolve(release, device, 'eval'));
        }
    }

    _detokenize(preprocessed, entities) {
        let output = '';
        let prevToken;
        for (let token of preprocessed.split(' ')) {
            if (token in LEGACY_TOKEN_MAP)
                token = LEGACY_TOKEN_MAP[token];

            if (token in entities) {
                let display;
                if (token.startsWith('GENERIC_ENTITY_'))
                    display = (entities[token].display || entities[token].value);
                else if (token.startsWith('DATE_'))
                    display = entities[token].month + '/' + entities[token].day + '/' + entities[token].year;
                else if (token.startsWith('TIME_'))
                    display = entities[token].hour + ':' + entities[token].minute;
                else if (token.startsWith('MEASURE_') || token.startsWith('DURATION_'))
                    display = entities[token].value + ' ' + entities[token].unit;
                else if (token.startsWith('CURRENCY_'))
                    display = '$' + entities[token].value;
                else if (token.startsWith('LOCATION_'))
                    display = entities[token].display;
                else if (token.startsWith('QUOTED_STRING_'))
                    display = '"' + entities[token] + '"';
                else
                    display = String(entities[token]);

                token = display || token;
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

    async _learnProgram(dialoguestate) {
        let targetCode;
        try {
            targetCode = ThingTalkUtils.serializePrediction(dialoguestate, this._preprocessed, this._entities, {
                locale: this._locale
            }).join(' ');
        } catch(e) {
            console.log(`${e.name}: ${e.message}`);
            this._rl.setPrompt('TT: ');
            this._rl.prompt();
            return;
        }
        console.log(`Learned: ${targetCode}`);
        this._sentenceCache.set(this._preprocessed, { parsed: targetCode });

        const device = this._getDevice(dialoguestate);

        const [dev, train] = await this._getFile(device);
        const out = coin(FEW_SHOT_TRAIN_PROBABILITY, this._rng) ? train : dev;

        const code = dialoguestate.prettyprint();

        out.write({
            id: this._id,
            turns: [{
                context: '',
                agent: '',
                agent_target: '',
                user: this._utterance,
                user_target: code
            }]
        });

        this.next();
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
        //try {
            await this._next();
        //} catch(e) {
        //    console.error(`Failed to process example ${this._id}: ${e.message}`);
        //    this.next();
        //}
    }

    async _next() {
        this._serial++;

        const { value: line, done } = this._nextLine.next();
        if (done) {
            this._quit();
            return;
        }
        this._state = 'loading';
        const { id, preprocessed, target_code } = line;
        if (id && id.startsWith('log/'))
            this._id = id;
        else
            this._id = 'log/' + (id || String(this._serial));
        this._preprocessed = preprocessed;
        this._entities = Genie.EntityUtils.makeDummyEntities(preprocessed);

        if (this._existingDataset.has(this._id)) {
            process.nextTick(() => this._next());
            return;
        }

        if (this._editExisting && this._editExisting !== target_code) {
            this._drop(target_code);
            return;
        }

        const cached = this._sentenceCache.get(this._preprocessed);
        if (cached) {
            // exact duplicate of an existing sentence, ignore
            process.nextTick(() => this._next());
            return;
            /*if (cached.parsed) {
                const parsed = await ThingTalkUtils.parsePrediction(cached.parsed, this._entities, {
                    thingpediaClient: this._tpClient,
                    schemaRetriever: this._schemas
                }, true);
                this._learnProgram(parsed);
            } else {
                this._drop(cached.dropped);
            }
            return;
            */
        }

        const utterance = this._detokenize(this._preprocessed, this._entities);
        await this._handleSentence(utterance, target_code);
    }

    async _handleCustomSentence(utterance) {
        const preprocessed = this._tokenizer.tokenize(utterance);
        this._preprocessed = preprocessed.tokens.join(' ');
        this._entities = preprocessed.entities;
        return this._handleSentence(utterance);
    }

    async _handleSentence(utterance, target_code) {
        this._utterance = utterance;

        let parsed;
        try {
            parsed = await this._parser.sendUtterance(this._preprocessed, /* context */ ['null'], /* contextEntities */ {}, {
                tokenized: true,
                skip_typechecking: true
            });
        } catch(e) {
            console.error(`Failed to parse ${utterance}: ${e.message}`);
            return;
        }

        let olddialoguestate;
        if (target_code && !this._editExisting) {
            let oldprogram;
            try {
                oldprogram = await ThingTalkUtils.parsePrediction(target_code.split(' '), parsed.entities, {
                    thingpediaClient: this._tpClient,
                    schemaRetriever: this._schemas
                }, true);
            } catch(e) {
                console.log(`Sentence ${this._id}'s existing code is incorrect: ${e}`); //'
            }
            if (oldprogram) {
                olddialoguestate = toDialogueState(oldprogram, this._idQueries);
                if (typeof olddialoguestate === 'string') {
                    console.log(`Sentence ${this._id}'s existing code is unusable: ${olddialoguestate}`);
                    olddialoguestate = undefined;
                } else {
                    this._adjustDevices(olddialoguestate);
                }
            }
        }

        this._state = 'top3';

        const candidates = await ThingTalkUtils.parseAllPredictions(parsed.candidates, parsed.entities, {
            thingpediaClient: this._tpClient,
            schemaRetriever: this._schemas
        });
        this._candidates = candidates;
        if (olddialoguestate)
            this._candidates.unshift(olddialoguestate);

        console.log(`Sentence #${this._serial+1} (${this._id}): ${this._utterance}`);
        console.log(`Entities: ${JSON.stringify(this._entities)}`);
        for (let i = 0; i < 3 && i < candidates.length; i++)
            console.log(`${i+1}) ${candidates[i].prettyprint()}`);
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
        default: './dropped-log.tsv',
    });
    parser.add_argument('input', {
        nargs: '+',
        help: `The script expects tsv input files with columns: id, utterance, target_code`
    });
    parser.add_argument('-l', '--locale', {
        required: false,
        default: 'en-US',
        help: `BGP 47 locale tag of the natural language being processed (defaults to en-US).`
    });
    parser.add_argument('--model', {
        required: false,
        default: 'file://' + path.resolve(path.dirname(module.filename), '../tmp/model'),
        help: `The URL of the natural language model.`
    });
    parser.add_argument('--edit-existing', {
        required: false,
        help: `Edit an existing OOD dataset instead of annotating a new dataset.`
    });

    const args = parser.parse_args();

    const platform = new Platform();
    platform.getSharedPreferences().set('developer-dir', RELEASES.map((r) => path.resolve(r)));

    const tpClient = new Tp.HttpClient(platform, 'https://almond-dev.stanford.edu/thingpedia');

    const lines = await readAllLines(args.input)
        .pipe(new Genie.DatasetParser())
        .pipe(new StreamUtils.ArrayAccumulator())
        .read();

    const trainer = new Trainer(lines, platform, tpClient, args);
    await trainer.init();

    trainer.next();
}
main();
