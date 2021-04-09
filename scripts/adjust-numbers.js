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

const fs = require('fs');
const Genie = require('genie-toolkit');
const byline = require('byline');

async function main() {
    const dialoguefile = process.argv[2];
    const schemaorgfile = process.argv[3];

    const sentences = new Map;
    for await (const line of fs.createReadStream(schemaorgfile, { encoding: 'utf8' }).pipe(byline())) {
        let [id, sentence] = line.trim().split('\t');
        if (sentences.has(id)) // duplicate IDs
            id = '200' + id;
        sentences.set(id, sentence);
    }

    const tokenizer = Genie.I18n.get('en-US').getTokenizer();

    const dialogues = [];
    const seen = new Set;
    for await (const dlg of fs.createReadStream(dialoguefile, { encoding: 'utf8' }).pipe(byline()).pipe(new Genie.DialogueParser())) {
        if (dlg.id.startsWith('schemaorg/')) {
            let id = dlg.id.substring('schemaorg/'.length);
            if (seen.has(id)) // duplicate IDs
                id = '200' + id;
            seen.add(id);
            dlg.id = 'schemaorg/' + id;
            const mapped = sentences.get(id);
            if (mapped) {
                dlg[0].user = mapped;

                // retokenize and adjust the numbers
                const tokenized = tokenizer.tokenize(mapped);
                let oldnumber = 13;
                for (const token of tokenized.rawTokens) {
                    if (/^[0-9]+(\.[0-9]+)?$/.test(token)) {
                        console.log('replacing ' + oldnumber + ' with ' + token);
                        dlg[0].user_target = dlg[0].user_target.replace(new RegExp('\\b' + oldnumber + '\\b', 'g'), token);
                        oldnumber ++;
                    }
                }
            }
        }
        dialogues.push({ id: dlg.id, turns: dlg });
    }

    const output = new Genie.DialogueSerializer();
    output.pipe(fs.createWriteStream(dialoguefile));
    for (const dlg of dialogues)
        output.write(dlg);
    output.end();
}
main();
