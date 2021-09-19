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
const ThingTalk = require('thingtalk');
const fs = require('fs');
//const assert = require('assert');
const byline = require('byline');
const crypto = require('crypto');

const StreamUtils = require('./lib/stream_utils');

// applies the device ID propagation logic to the dev and few-shot
// train set, making it consistent with the synthesized data
// see lib/templates/state_manip.ts in genie-toolkit for an
// explanation of this logic

class CollectDeviceIDVisitor extends ThingTalk.Ast.NodeVisitor {
    constructor() {
        super();
        this.collection = new Map();
    }

    visitDeviceSelector(selector) {
        if (selector.all) {
            this.collection.set(selector.kind, 'all');
            return false;
        }
        if (!selector.id)
            return false;
        this.collection.set(selector.kind, selector.id);
        return false;
    }
}

class ApplyDeviceIDVisitor extends ThingTalk.Ast.NodeVisitor {
    constructor(collection) {
        super();
        this.collection = collection;
    }

    /**
     *
     * @param {ThingTalk.Ast.DeviceSelector} selector
     * @returns
     */
    visitDeviceSelector(selector) {
        if (selector.attributes.find((ip) => ip.name === 'name') || selector.all)
            return false;

        const existing = this.collection.get(selector.kind);
        if (existing === 'all')
            selector.all = true;
        else if (existing)
            selector.id = existing;
        else
            selector.id = null;
        return false;
    }
}

/**
 *
 * @param {ThingTalk.Ast.DialogueState} context
 * @param {ThingTalk.Ast.DialogueState} userTarget
 * @returns
 */
function propagateDeviceIDs(context, userTarget) {

    let currentIdx = context.history.length-1;
    for (let idx = 0; idx < context.history.length; idx++) {
        if (context.history[idx].results === null) {
            currentIdx = idx-1;
            break;
        }
    }

    const collectVisitor = new CollectDeviceIDVisitor();
    if (currentIdx >= 0)
        context.history[currentIdx].visit(collectVisitor);
    for (let i = currentIdx+1; i < context.history.length; i++)
        context.history[i].visit(collectVisitor);

    const applyVisitor = new ApplyDeviceIDVisitor(collectVisitor.collection);
    return userTarget.history.map((item) => {
        item.visit(applyVisitor);
        return item;
    });
}

function parseNewOrOldSyntax(code) {
    try {
        return ThingTalk.Syntax.parse(code, ThingTalk.Syntax.SyntaxType.Normal);
    } catch(e1) {
        if (e1.name !== 'SyntaxError')
            throw e1;
        try {
            const parsed = ThingTalk.Syntax.parse(code, ThingTalk.Syntax.SyntaxType.Legacy);
            return parsed;
        } catch(e2) {
            if (e2.name !== 'SyntaxError')
                throw e2;
            throw e1;
        }
    }
}

function sha256sum(content) {
    const hash = crypto.createHash('sha256');
    hash.update(content);
    return hash.digest('hex');
}

class RemoveSensitiveInfoVisitor extends ThingTalk.Ast.NodeVisitor {
    visitDeviceSelector(sel) {
        if (sel.id === 'thingengine-own-global')
            sel.id = null;
        if (sel.id && sel.id !== sel.kind) {
            let kind = sel.kind;
            if (sel.kind === 'org.thingpedia.media-source' || sel.kind === 'org.thingpedia.media-player')
                kind = 'com.spotify';
            sel.id = kind + '-XXXXXXXX';
        }
        sel.attributes = sel.attributes.filter((ip) => ip.name !== 'name');
        return true;
    }
    visitEntityValue(value) {
        if (value.type === 'com.spotify:device' || value.type === 'org.thingpedia.media-player:device') {
            value.value = 'XXXXXXXX';
            value.display = null;
        }
        if (value.type === 'tt:device_id') {
            value.value = 'XXXXXXXX';
            value.display = null;
        }
        return true;
    }
    visitDialogueHistoryItem(value) {
        delete value.impl_annotations.error_detail;
        delete value.impl_annotations.error_stack;
        return true;
    }
    visitDialogueHistoryResultItem(value) {
        if (value.value.id && value.value.id.isEntity &&
            value.value.id.type === 'com.smartnews:article' &&
            value.value.content && value.value.content.isString &&
            !value.value.content.value.startsWith('smartnews-sha256:')) {
            // replace the news body with a hash, to avoid putting an entire news body
            // in a public git repository
            value.value.content.value='smartnews-sha256:' + sha256sum(value.value.content.value);
        }
        return true;
    }
}

async function processDialogue(dlg) {
    const visitor = new RemoveSensitiveInfoVisitor();
    for (let turnIdx = 1; turnIdx < dlg.length; turnIdx++) {
        const turn = dlg[turnIdx];
        const context = dlg[turnIdx].context;
        const parsedContext = parseNewOrOldSyntax(context);
        parsedContext.visit(visitor);
        const parsedAgentTarget = parseNewOrOldSyntax(turn.agent_target);
        parsedAgentTarget.visit(visitor);
        const parsedUserTarget = parseNewOrOldSyntax(turn.user_target);
        parsedUserTarget.visit(visitor);

        propagateDeviceIDs(parsedContext, parsedUserTarget);
        dlg[turnIdx].context = parsedContext.prettyprint();
        dlg[turnIdx].agent_target = parsedAgentTarget.prettyprint();
        dlg[turnIdx].user_target = parsedUserTarget.prettyprint();
    }
}

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
        try {
            await processDialogue(dlg);
            output.write({ id: dlg.id, turns: dlg });
        } catch(e) {
            console.error(`${dlg.id} failed: ${e.message}`);
            console.error(e.stack);
            anyError = true;
        }
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
