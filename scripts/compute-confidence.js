// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2021 The Board of Trustees of the Leland Stanford Junior University
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

const Tp = require('thingpedia');
const { readAllLines } = require('./lib/argutils');

async function parse(context, sentence) {
    const begin = Date.now();
    const data = JSON.stringify({
        context: context,
        entities: {},
        q: sentence,
        skip_typechecking: true,
        thingtalk_version: '2.0.0-alpha.1'
    });
    const res = await Tp.Helpers.Http.post('http://127.0.0.1:8400/en-US/query', data,  {
        dataContentType: 'application/json'
    });
    const parsed = JSON.parse(res);
    const end = Date.now();
    parsed.candidates[0].time = end - begin;
    return parsed.candidates[0];
}

const MINIBATCH_SIZE = 5;

async function main() {
    const lines = [];
    for await (const line of readAllLines(process.argv.slice(2)))
        lines.push(line);

    const parses = [];
    for (let i = 0; i < lines.length; i += MINIBATCH_SIZE) {
        const minibatch = lines.slice(i, i+MINIBATCH_SIZE);
        console.error(`${i/MINIBATCH_SIZE}/${Math.ceil(lines.length/MINIBATCH_SIZE)}`);
        await Promise.all(minibatch.map(async (line) => {
            const [id, context, sentence, targetCode] = line.split('\t');
            if (context !== 'null')
                return;
            const parsed = await parse(context, sentence);
            const correct = parsed.code.join(' ') === targetCode;
            parses.push({ id, sentence, score: parsed.score, ood: targetCode === '$failed ;', correct, time: parsed.time });
        }));
    }

    parses.sort((p1, p2) => {
        return p2.score - p1.score;
    });

    for (const parse of parses)
        console.log(`${parse.id}\t${parse.sentence}\t${parse.score}\t${parse.ood}\t${parse.correct}\t${parse.time}`);
}
main();
