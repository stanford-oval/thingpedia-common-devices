// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Genie
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

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { promises: pfs } = require('fs');
const byline = require('byline');
const ThingTalk = require('thingtalk');
const Genie = require('genie-toolkit');

const StreamUtils = require('./lib/stream_utils');

// subset the "everything" datasets for a specific release

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

class Visitor extends ThingTalk.Ast.NodeVisitor {
    constructor(allDevices) {
        super();
        this.allDevices = allDevices;
    }

    visitDeviceSelector(selector) {
        this.allDevices.add(selector.kind);
    }
}

async function processParaphrase(devices, release) {
    const out = new Genie.DatasetStringifier();
    out.pipe(fs.createWriteStream('./eval/' + release + '/paraphrase.tsv'));
    for await (const turn of fs.createReadStream('./eval/everything/paraphrase.tsv', { encoding: 'utf8' })
        .pipe(byline()).pipe(new Genie.DatasetParser({ contextual: true }))) {

        try {
            let contextEntities = {};
            let turnDevices = new Set;
            if (turn.context !== 'null') {
                contextEntities = Genie.EntityUtils.makeDummyEntities((turn.context || '').split(' '));
                const context = ThingTalk.Syntax.parse(turn.context.split(' '), ThingTalk.Syntax.SyntaxType.Tokenized, contextEntities);
                context.visit(new Visitor(turnDevices));
            }

            const tokens = turn.preprocessed.split(' ');
            const entities = Genie.EntityUtils.makeDummyEntities(turn.preprocessed);
            const tokenized = { tokens, entities };
            Genie.EntityUtils.renumberEntities(tokenized, contextEntities);

            const parsed = ThingTalk.Syntax.parse(turn.target_code.split(' '), ThingTalk.Syntax.SyntaxType.Tokenized, tokenized.entities);
            parsed.visit(new Visitor(turnDevices));

            let good = true;
            for (const device of turnDevices) {
                if (!devices.has(device)) {
                    good = false;
                    break;
                }
            }
            if (good)
                out.write(turn);
        } catch(e) {
            console.error(`Failed to process ${turn.id}: ${e.message}`);
        }
    }
    out.end();
    await StreamUtils.waitFinish(out);
}


async function processManual(devices, release, dir) {
    const out = new Genie.DialogueSerializer();
    out.pipe(fs.createWriteStream('./eval/' + release + '/' + dir + '/annotated.txt'));
    for await (const dlg of fs.createReadStream('./eval/everything/' + dir + '/annotated.txt', { encoding: 'utf8' })
        .pipe(byline()).pipe(new Genie.DialogueParser({ contextual: true }))) {

        let turnDevices = new Set;
        for (const turn of dlg) {
            if (turn.context) {
                const context = ThingTalk.Syntax.parse(turn.context);
                context.visit(new Visitor(turnDevices));
            }
            if (turn.agent_target) {
                const agent_target = ThingTalk.Syntax.parse(turn.agent_target);
                agent_target.visit(new Visitor(turnDevices));
            }
            const user_target = ThingTalk.Syntax.parse(turn.user_target);
            user_target.visit(new Visitor(turnDevices));
        }

        let good = true;
        for (const device of turnDevices) {
            if (!devices.has(device)) {
                good = false;
                break;
            }
        }
        if (good)
            out.write({ id: dlg.id, turns: dlg });
    }
    out.end();
    await StreamUtils.waitFinish(out);
}

// must be in inheritance order
const RELEASES = ['builtin', 'main', 'universe', 'staging'];

async function main() {
    const what = process.argv[2];
    assert(['paraphrase', 'dev', 'test', 'train'].includes(what));
    const release = process.argv[3];
    assert(RELEASES.includes(release) || release === 'custom');

    const devices = new Set;
    if (release === 'custom') {
        for (const device of process.argv.slice(4))
            devices.add(device);
    } else {
        for (const r of RELEASES.slice(0, RELEASES.indexOf(release)+1)) {
            for (const d of await pfs.readdir(path.resolve(r))) {
                if (!await existsSafe(path.resolve(r, d, 'manifest.tt')))
                    continue;
                devices.add(d);
            }
        }
    }

    if (what === 'paraphrase')
        await processParaphrase(devices, release);
    else
        await processManual(devices, release, what);
}
main();
