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
const Tp = require('thingpedia');
const ThingTalk = require('thingtalk');
const Genie = require('genie-toolkit');
const { ThingTalkUtils } = Genie;

const StreamUtils = require('./lib/stream_utils');
const Platform = require('./lib/platform');
const { readAllLines } = require('./lib/argutils');

let postal;
try {
    postal = require('node-postal');
} catch(e) {
    postal = undefined;
}

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

// must be in inheritance order
const RELEASES = ['builtin', 'main', 'universe', 'staging'];

class GetFunctionsVisitor extends ThingTalk.Ast.NodeVisitor {
    constructor() {
        super();
        this.functions = [];
    }

    visitInvocation(inv) {
        this.functions.push(inv.selector.kind + '.' + inv.channel);
    }
}

class Analyzer {
    constructor(lines, platform, tpClient, args) {
        this._lines = lines;
        this._platform = platform;
        this._tpClient = tpClient;
        this._schemas = new ThingTalk.SchemaRetriever(this._tpClient, null, true);
        this._langPack = Genie.I18n.get(args.locale);
        this._tokenizer = this._langPack.getTokenizer();
        this._droppedFilename = args.dropped;
        this._annotatedFilename = args.annotated_out;

        this._counters = {};
        this._totalClassified = 0;
        this._total = 0;

        this._devices = new Map;
        this._existingDataset = new Map;
        this._sentenceCache = new Map;
    }

    _classifyProgram(program, release) {
        const visitor = new GetFunctionsVisitor();
        program.visit(visitor);
        const functions = visitor.functions;
        if (functions.length === 0)
            return 'chatty'; // hello

        if (functions.length === 1 &&
            (functions[0] === 'org.thingpedia.builtin.thingengine.builtin.commands' ||
             functions[0] === 'org.thingpedia.builtin.thingengine.builtin.device'))
            return 'meta-command';

        if (release === 'staging')
            return 'new device (staging)';

        return 'ok';
    }

    async _tryLoadExistingDataset(filename, release) {
        //if (!await existsSafe(filename))
        //    return;
        for await (const dlg of readAllLines([filename]).pipe(new Genie.DialogueParser())) {
            const turn0 = dlg[0];
            const preprocessed = this._tokenizer.tokenize(turn0.user);
            const program = await ThingTalkUtils.parse(turn0.user_target, this._schemas);

            const classification = this._classifyProgram(program, release);
            this._existingDataset.set(dlg.id, classification);
            this._sentenceCache.set(preprocessed.tokens.join(' '), classification);
        }
    }

    async _loadAllExistingDatasets() {
        for await (const row of fs.createReadStream(this._droppedFilename).pipe(csvparse({ delimiter: '\t' }))) {
            const [id, sentence, comment] = row;
            this._existingDataset.set(id, comment);

            if (sentence !== '<redacted>')
                this._sentenceCache.set(sentence, comment);
        }

        for (const r of RELEASES) {
            await this._tryLoadExistingDataset(path.resolve('eval', r, 'dev/annotated.txt'), r);
            await this._tryLoadExistingDataset(path.resolve('eval', r, 'train/annotated.txt'), r);

            for (const d of await pfs.readdir(path.resolve(r))) {
                if (!await existsSafe(path.resolve(r, d, 'manifest.tt')))
                    continue;
                assert(!this._devices.has(d));

                this._devices.set(d, r);

                await this._tryLoadExistingDataset(path.resolve(r, d, 'eval/dev/annotated.txt'), r);
                await this._tryLoadExistingDataset(path.resolve(r, d, 'eval/train/annotated.txt'), r);
            }
        }
    }

    _looksLikeAddress(sentence) {
        if (!postal)
            return false;
        const parsed = postal.parser.parse_address(sentence);
        if (parsed && parsed.find((item) => item.component === 'house_number') &&
            (parsed.find((item) => item.component === 'postcode') ||
             parsed.find((item) => item.component === 'road')))
            return true;
        return false;
    }

    _looksLikeForeignLanguage(sentence) {
        // it looks like foreign language if there isn't some English-looking (ie, ASCII) word
        return !sentence.split(' ').some((word) => /^[A-Za-z]+$/.test(word));
    }

    _heuristicClassification(sentence) {
        if (sentence.indexOf(' bob ') >= 0 && sentence.indexOf(' blood ') >= 0)
            return 'policy or remote program';
        if (sentence === 'help')
            return 'meta-command';
        if (sentence === 'hi' || sentence === 'hello')
            return 'chatty';
        if (sentence.startsWith('configure '))
            return 'meta-command';
        if (this._looksLikeAddress(sentence) || sentence.indexOf('zoom meeting') >= 0
            || sentence.indexOf('passcode') >= 0 || sentence.indexOf('password') >= 0)
            return 'redacted';
        if (this._looksLikeForeignLanguage(sentence))
            return 'foreign language';
        if (sentence.length < 2 || sentence.length >= 500 || sentence.startsWith('now = >'))
            return 'junk';

        return 'unknown';
    }

    async analyze() {
        await this._loadAllExistingDatasets();

        let out;
        if (this._annotatedFilename)
            out = fs.createWriteStream(this._annotatedFilename);

        for (const ex of this._lines) {
            const id = 'log/' + ex.id;

            let classification;
            if (this._existingDataset.has(id))
                classification = this._existingDataset.get(id);
            else if (this._sentenceCache.has(ex.preprocessed))
                classification = this._sentenceCache.get(ex.preprocessed);
            else
                classification = this._heuristicClassification(ex.preprocessed);
            if (classification === 'gnome' || classification === 'phone')
                classification = 'new device (staging)';
            if (classification === 'stream' || classification === 'dialogue-model')
                classification = 'unsupported (dialogue model)';

            this._total ++;
            if (classification !== 'unknown') {
                this._totalClassified ++;
                this._counters[classification] = (this._counters[classification] || 0) + 1;

                if (out && classification !== 'redacted')
                    out.write(`${id}\t${ex.preprocessed}\t${classification}\n`);
            }
        }

        if (out)
            out.end();

        console.log('total =', this._total);
        console.log(`classified = ${this._totalClassified} (${(this._totalClassified/this._total * 100).toFixed(1)}%)`);
        const keys = Object.keys(this._counters);
        keys.sort((a, b) => this._counters[b] - this._counters[a]);
        for (const key of keys)
            console.log(`${key} = ${this._counters[key]} (${(this._counters[key]/this._totalClassified * 100).toFixed(1)}%)`);
        console.log();
        for (const key of keys)
            console.log(`    "${key}" : ${this._counters[key]}`);
    }
}

async function main() {
    const parser = new argparse.ArgumentParser({
        add_help: true,
        description: `Import and manually annotate the Almond logs.`
    });
    parser.add_argument('-l', '--locale', {
        required: false,
        default: 'en-US',
        help: `BGP 47 locale tag of the natural language being processed (defaults to en-US).`
    });
    parser.add_argument('--dropped', {
        required: false,
        default: './dropped-log.tsv',
    });
    parser.add_argument('--annotated-out', {
        required: false,
    });
    parser.add_argument('input', {
        nargs: '+',
        help: `The script expects tsv input files with columns: id, utterance, target_code`
    });

    const args = parser.parse_args();

    const platform = new Platform();
    platform.getSharedPreferences().set('developer-dir', RELEASES.map((r) => path.resolve(r)));

    const tpClient = new Tp.HttpClient(platform, 'https://almond-dev.stanford.edu/thingpedia');

    const lines = await readAllLines(args.input)
        .pipe(new Genie.DatasetParser())
        .pipe(new StreamUtils.ArrayAccumulator())
        .read();

    const analyzer = new Analyzer(lines, platform, tpClient, args);
    await analyzer.analyze();
}
main();
