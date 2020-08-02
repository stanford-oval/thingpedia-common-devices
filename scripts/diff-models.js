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

const path = require('path');
const fs = require('fs');

const { readAllLines } = require('./lib/argutils');

const RELEASE = 'universe';

async function loadErrorAnalysis(model) {
    const filename = path.resolve('./eval', RELEASE, 'dev', model + '.nlu.debug');

    const out = new Map;
    for await (const line of readAllLines([filename])) {
        const [id, result, utterance, gold, prediction] = line.split('\t');
        if (result === 'ok')
            continue;
        out.set(id, { result, utterance, gold, prediction });
    }

    return out;
}

async function main() {
    const m1 = await loadErrorAnalysis(process.argv[2]);
    const m2 = await loadErrorAnalysis(process.argv[3]);

    console.log();
    console.log('-----');
    console.log('LOST');
    for (const id of m2.keys()) {
        if (m1.has(id))
            continue;
        const { result, utterance, gold, prediction } = m2.get(id);
        console.log(`${id}\t${result}\t${utterance}`);
        console.log(gold);
        console.log(prediction);
        console.log();
    }

    console.log();
    console.log('-----');
    console.log('GAINED');
    for (const id of m1.keys()) {
        if (m2.has(id))
            continue;
        const { result, utterance, gold, prediction } = m1.get(id);
        console.log(`${id}\t${result}\t${utterance}`);
        console.log(gold);
        console.log(prediction);
        console.log();
    }
}
main();
