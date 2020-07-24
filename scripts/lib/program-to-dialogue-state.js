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

const ThingTalk = require('thingtalk');
const Ast = ThingTalk.Ast;
const { notifyAction } = ThingTalk.Generate;

function isTableJoin(table) {
    if (table.isJoin)
        return true;
    if (table.isInvocation ||
        table.isVarRef)
        return false;

    if (table.isFilter ||
        table.isSort ||
        table.isIndex ||
        table.isSlice ||
        table.isProjection ||
        table.isCompute ||
        table.isAlias ||
        table.isAggregation)
        return isTableJoin(table.table);

    throw new TypeError(table.constructor.name);
}

function adjustStatementsForInitialRequest(stmt, idQueries) {
    if (stmt.stream)
        return 'has stream';

    if (stmt.table && isTableJoin(stmt.table))
        return 'has table join';

    const newStatements = [];
    if (stmt.table && stmt.actions.some((a) => !a.isNotify)) {
        // split into two statements, one getting the data, and the other using it

        const queryStmt = new Ast.Statement.Command(null, stmt.table, [notifyAction()]);
        newStatements.push(queryStmt);

        const newActions = stmt.actions.map((a) => a.clone());
        for (let action of newActions) {
            if (!action.isInvocation)
                throw new TypeError('???');
            assert (action.invocation.selector.isDevice);

            const in_params = action.invocation.in_params;
            for (let in_param of in_params) {
                if (in_param.value.isEvent) // TODO
                    return 'has $event';
                if (!in_param.value.isVarRef)
                    continue;
                if (in_param.value.name.startsWith('__const_'))
                    continue;

                // TODO: parameter passing for non ID parameter
                if (in_param.value.name !== 'id')
                    return 'has non-id param passing';

                // parameter passing
                // FIXME we need a new ThingTalk value type...
                in_param.value = new Ast.Value.Undefined(true);
            }
        }
        const actionStmt = new Ast.Statement.Command(null, null, newActions);
        newStatements.push(actionStmt);
    } else {
        if (!stmt.table) {
            for (let action of stmt.actions) {
                for (let param of action.invocation.in_params) {
                    if (param.value.isUndefined) {
                        const type = action.invocation.schema.getArgType(param.name);
                        if (type.isEntity && idQueries.has(type.type)) {
                            const query = idQueries.get(type.type);
                            newStatements.push(new Ast.Statement.Command(null, new Ast.Table.Invocation(null,
                                new Ast.Invocation(null,
                                    new Ast.Selector.Device(null, query.class.name, null, null),
                                    query.name,
                                    [],
                                    query),
                                query), [notifyAction()]));
                        }
                    } else if (param.value.isEntity) {
                        const type = action.invocation.schema.getArgType(param.name);
                        if (type.isEntity && idQueries.has(type.type)) {
                            const query = idQueries.get(type.type);
                            const invtable = new Ast.Table.Invocation(null,
                                new Ast.Invocation(null,
                                    new Ast.Selector.Device(null, query.class.name, null, null),
                                    query.name,
                                    [],
                                    query),
                                query);
                            const filtertable = new Ast.Table.Filter(null, invtable, new Ast.BooleanExpression.Atom(null,
                                'id', '=~', new Ast.Value.String(param.value.display)), query);
                            newStatements.push(new Ast.Statement.Command(null, filtertable, [notifyAction()]));
                            param.value = new Ast.Value.Undefined();
                        }
                    }
                }
            }
        }
        newStatements.push(stmt);
    }

    return newStatements;
}

function toDialogueState(program, idQueries) {
    if (program instanceof Ast.DialogueState)
        return program;

    if (!(program instanceof Ast.Program))
        return 'not a program';
    if (program.principal)
        return 'remote program';
    if (program.rules.length !== 1)
        return 'more than one rule';
    const newStatements = adjustStatementsForInitialRequest(program.rules[0], idQueries);
    if (typeof newStatements === 'string')
        return newStatements;

    const history = newStatements.map((stmt) => new Ast.DialogueHistoryItem(null, stmt, null, 'accepted'));
    return new Ast.DialogueState(null, 'org.thingpedia.dialogue.transaction', 'execute', null, history);
}
module.exports = toDialogueState;
