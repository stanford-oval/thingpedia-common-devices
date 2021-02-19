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

const Genie = require('genie-toolkit');
const ThingTalk = require('thingtalk');
const Ast = ThingTalk.Ast;
const Tp = require('thingpedia');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const { readAllLines } = require('./lib/argutils');
const StreamUtils = require('./lib/stream_utils');
const Platform = require('./lib/platform');

const C = require('genie-toolkit/languages/thingtalk/ast_manip');

const _platform = new Platform();
_platform.getSharedPreferences().set('developer-dir', 'main');

const _tpClient = new Tp.HttpClient(_platform, 'https://dev.almond.stanford.edu/thingpedia');
const _schemas = new ThingTalk.SchemaRetriever(_tpClient, null, false);


function tableUsesIDFilter(table) {
    const filterTable = C.findFilterTable(table);
    if (!filterTable)
        return false;

    return C.filterUsesParam(filterTable.filter, 'id');
}

function fix(target) {
    assert(target instanceof Ast.DialogueState);
    if (target.history.length === 1) {
        const stmt = target.history[0].stmt;

        if (stmt.table && stmt.actions.some((a) => !a.isNotify)) {
            let newTable = stmt.table;
            // swap sort & filter (which is backwards in the snips-nlu annotations)
            if (newTable.isFilter && newTable.table.isSort) {
                newTable = new Ast.Table.Sort(null,
                    new Ast.Table.Filter(null, newTable.table.table, newTable.filter, newTable.schema),
                    newTable.table.field, newTable.table.direction, newTable.schema);
            }
            if ((tableUsesIDFilter(newTable) || newTable.isSort) && !newTable.isIndex)
                newTable = new Ast.Table.Index(null, newTable, [new Ast.Value.Number(1)], newTable.schema);

            stmt.table = newTable;
        }
        return;
    }

    if (target.history.length !== 2)
        return;

    const first = target.history[0];
    const second = target.history[1];
    if (first.stmt.actions.some((a) => !a.isNotify) || second.stmt.table) {
        console.error(`Do not know how to handle: ` + target.prettyprint());
        return;
    }

    const action = second.stmt.actions[0].invocation;
    for (let param of action.in_params) {
        if (param.value.isUndefined)
            param.value = new Ast.Value.VarRef('id');
    }

    let newTable = first.stmt.table;

    // swap sort & filter (which is backwards in the snips-nlu annotations)
    if (newTable.isFilter && newTable.table.isSort) {
        newTable = new Ast.Table.Sort(null,
            new Ast.Table.Filter(null, newTable.table.table, newTable.filter, newTable.schema),
            newTable.table.field, newTable.table.direction, newTable.schema);
    }

    if ((tableUsesIDFilter(newTable) || newTable.isSort) && !newTable.isIndex)
        newTable = new Ast.Table.Index(null, newTable, [new Ast.Value.Number(1)], newTable.schema);

    const newStmt = new Ast.Statement.Command(null, newTable, second.stmt.actions);
    const newItem = new Ast.DialogueHistoryItem(null, newStmt, null, 'accepted');
    target.history = [newItem];
}

async function processTXT(filename) {
    const dlgs = await readAllLines([filename])
        .pipe(new Genie.DialogueParser())
        .pipe(new StreamUtils.ArrayAccumulator())
        .read();

    const out = [];
    for (let dlg of dlgs) {
        out.push({ id: dlg.id, turns: dlg });
        if (dlg.length > 1) // needs manual fixing if multiturn (must rerun the annotator)
            continue;

        const target = ThingTalk.Grammar.parse(dlg[0].user_target);
        await target.typecheck(_schemas, false);
        fix(target);

        dlg[0].user_target = target.prettyprint();
    }

    const writer = new Genie.DialogueSerializer();
    for (let dlg of out)
        writer.write(dlg);

    await StreamUtils.waitFinish(writer.pipe(fs.createWriteStream(filename)));
}

async function processTSV(filename) {
    const examples = await readAllLines([filename])
        .pipe(new Genie.DatasetParser({ contextual: true, preserveId: true }))
        .pipe(new StreamUtils.ArrayAccumulator())
        .read();

    for (let ex of examples) {
        assert(ex.context === 'null');

        const entities = Genie.EntityUtils.makeDummyEntities(ex.preprocessed);
        const target = ThingTalk.NNSyntax.fromNN(ex.target_code.split(' '), entities);
        await target.typecheck(_schemas, false);
        fix(target);

        ex.target_code = ThingTalk.NNSyntax.toNN(target, ex.preprocessed, entities, { typeAnnotations: false }).join(' ');
    }

    const writer = new Genie.DatasetStringifier();
    for (let dlg of examples)
        writer.write(dlg);

    await StreamUtils.waitFinish(writer.pipe(fs.createWriteStream(filename)));
}

async function main() {
    for (let filename of process.argv.slice(2)) {
        const type = path.extname(filename);
        assert(type === '.txt' || type === '.tsv');

        if (type === '.txt')
            await processTXT(filename);
        else
            await processTSV(filename);
    }
}
main();
