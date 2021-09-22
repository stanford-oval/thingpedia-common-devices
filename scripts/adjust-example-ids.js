// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2021 The Board of Trustees of the Leland Stanford Junior University
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

const Genie = require('genie-toolkit');
const fs = require('fs');
//const assert = require('assert');
const byline = require('byline');

const StreamUtils = require('./lib/stream_utils');

/**
 * @type {Set<string>}
 */
const ids = new Set;
/**
 * @type {Record<string, number>}
 */
const nextId = {};

/**
 *
 * @param {string} filename
 */
async function processFilename(filename) {
    const input = fs.createReadStream(filename, { encoding: 'utf8' })
        .pipe(byline())
        .pipe(new Genie.DialogueParser());
    const outputfile = fs.createWriteStream(filename + '.tmp', { encoding: 'utf8' });
    const output = new Genie.DialogueSerializer();
    output.pipe(outputfile);

    let anyError = false;
    for await (const dlg of input) {
        if (ids.has(dlg.id)) {
            // duplicate
            const [prefix,] = dlg.id.split('/');
            const adjusted = nextId[prefix] || 0;
            nextId[prefix] = adjusted+1;
            dlg.id = prefix + '/' + adjusted;
            ids.add(dlg.id);
        } else {
            // not duplicate
            ids.add(dlg.id);

            const [prefix, suffix] = dlg.id.split('/');
            nextId[prefix] = Math.max(nextId[prefix] || 0, parseInt(suffix)+1);
        }

        output.write({ id: dlg.id, turns: dlg });
    }

    output.end();
    await StreamUtils.waitFinish(outputfile);

    if (!anyError)
        await fs.promises.rename(filename + '.tmp', filename);
}

async function main() {
    for (const filename of process.argv.slice(2)) {
        console.log(`Processing ${filename}...`);
        await processFilename(filename);
    }
}
main();
