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

const ThingTalk = require('thingtalk');
const Ast = ThingTalk.Ast;

function isTableJoin(table) {
    if (table instanceof Ast.ChainExpression) {
        if (table.expressions.length > 2 ||
            (table.expressions.length > 1 && table.schema.functionType !== 'action'))
            return true;
        return isTableJoin(table.expressions[0]);
    }
    if (table instanceof Ast.InvocationExpression ||
        table instanceof Ast.FunctionCallExpression)
        return false;

    if (table instanceof Ast.FilterExpression ||
        table instanceof Ast.SortExpression ||
        table instanceof Ast.IndexExpression ||
        table instanceof Ast.SliceExpression||
        table instanceof Ast.ProjectionExpression ||
        table instanceof Ast.AliasExpression ||
        table instanceof Ast.AggregationExpression ||
        table instanceof Ast.MonitorExpression)
        return isTableJoin(table.expression);

    throw new TypeError(table.constructor.name);
}

class AdjustDefaultParametersVisitor extends Ast.NodeVisitor {
    visitInvocation(invocation) {
        invocation.in_params = invocation.in_params.filter((ip) => {
            const arg = invocation.schema.getArgument(ip.name);
            const _default = arg.impl_annotations.default;
            if (_default && ip.value.equals(_default))
                return false;
            return true;
        });
        return false;
    }
}

function adjustDefaultParameters(stmt) {
    stmt.visit(new AdjustDefaultParametersVisitor());
    return stmt;
}

function adjustStatementsForInitialRequest(stmt, idQueries) {
    if (stmt.stream)
        return [adjustDefaultParameters(stmt)];

    if (isTableJoin(stmt.expression))
        return 'has table join';

    const newStatements = [];
    if (stmt.expression.expressions.length >= 2) {
        // split into two statements, one getting the data, and the other using it

        const queryStmt = new Ast.ExpressionStatement(null, stmt.first);
        newStatements.push(queryStmt);

        const newAction = stmt.last;
        if (!(newAction instanceof Ast.InvocationExpression))
            throw new TypeError('???');

        const in_params = newAction.invocation.in_params;
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
        const actionStmt = new Ast.ExpressionStatement(null, newAction);
        adjustDefaultParameters(actionStmt);
        newStatements.push(actionStmt);
    } else if (stmt.expression.schema.functionType === 'action') {
        const action = stmt.last;
        for (let param of action.invocation.in_params) {
            if (param.value.isUndefined) {
                const type = action.invocation.schema.getArgType(param.name);
                if (type.isEntity && idQueries.has(type.type)) {
                    const query = idQueries.get(type.type);
                    newStatements.push(new Ast.ExpressionStatement(null, new Ast.InvocationExpression(null,
                        new Ast.Invocation(null,
                            new Ast.DeviceSelector(null, query.class.name, null, null),
                            query.name,
                            [],
                            query),
                        query)));
                }
            } else if (param.value.isEntity) {
                const type = action.invocation.schema.getArgType(param.name);
                if (type.isEntity && idQueries.has(type.type)) {
                    const query = idQueries.get(type.type);
                    const invtable = new Ast.InvocationExpression(null,
                        new Ast.Invocation(null,
                            new Ast.DeviceSelector(null, query.class.name, null, null),
                            query.name,
                            [],
                            query),
                        query);
                    const filtertable = new Ast.FilterExpression(null, invtable, new Ast.BooleanExpression.Atom(null,
                        'id', '=~', new Ast.Value.String(param.value.display)), query);
                    newStatements.push(new Ast.ExpressionStatement(null, filtertable));
                    param.value = new Ast.Value.Undefined();
                }
            }
        }
        adjustDefaultParameters(stmt);
        newStatements.push(stmt);
    } else {
        adjustDefaultParameters(stmt);
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
    if (program.statements.length !== 1)
        return 'more than one rule';
    const newStatements = adjustStatementsForInitialRequest(program.statements[0], idQueries);
    if (typeof newStatements === 'string')
        return newStatements;

    const history = newStatements.map((stmt) => new Ast.DialogueHistoryItem(null, stmt, null, 'accepted'));
    return new Ast.DialogueState(null, 'org.thingpedia.dialogue.transaction', 'execute', null, history);
}
module.exports = toDialogueState;
