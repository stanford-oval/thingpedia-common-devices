// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of org.agent.restaurant-2
//
// Copyright 2022 undefined <undefined>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');
const interpolate = require('string-interp');
const Genie = require('/home/junwen/CS224S-genie-server/node_modules/genie-toolkit');
const ThingTalk = require('/home/junwen/CS224S-genie-server/node_modules/thingtalk');
const { DLGResultStatus } = require('/home/junwen/CS224S-genie-server/node_modules/genie-toolkit/dist/lib/dialogue-agent/geniescript');

class BMAgentDialogueHandler extends Genie.DialogueAgent.Geniescript.GeniescriptAgent {
    /**
     *
     * @param {string} locale
     * @param {string} timezone
     */
    constructor(locale, timezone) {
        super(Tp.DialogueHandler.Priority.PRIMARY, 'org.fm.agent', '', 'org.fm.agent');
        this._locale = locale;
        this._timezone = timezone;
        this._ = BMAgent.gettext.gettext;
    }

    _interp(string, args) {
        return interpolate(string, args, {
            locale: this._locale,
            timezone: this._timezone,
        });
    }

    getState() {
        return { lastQuerySuggestion: this._lastQuerySuggestion };
    }

    async initialize(initialState) {
        await super.initialize();
        if (initialState)
            this._lastQuerySuggestion = initialState.lastQuerySuggestion;
        return null;
    }

    reset() {
        this._lastQuerySuggestion = null;
    }

    async *logic() {
        let dlg = this.dlg;

        var dict = {'Smoke Detector': 'Fire Alarm Manual Pull Station',
            'Fire Alarm Manual Pull Station': 'Smoke Detector',
            'Hot Water Coil': 'Variable Air Volume Unit',
            'Variable Air Volume Unit' : 'Hot Water Coil',
            'Transformer' : 'Electrical Panel',
            'Electrical Panel' : 'Transformer'};
        function ifInDesiredMapping() {
            const lastcommand = dlg.getLastCommand();
            const slots = ThingTalk.Ast.getAllAtomBooleanExpressions(lastcommand);
            for (const [key, value] of Object.entries(dict)) {
                for (let slot of slots) {
                    if (slot.value.prettyprint().includes(key))
                        return [true, value, key];
                }
            }
            return [false, null];
        }

        dlg.say("Hi there! This is facility management assistant, at your service.\n");

        // immediately yield to the user, and only come back 
        // after user has found some objects in fm domain
        let result = yield * dlg.expectType('fm', null);
        // let not_prompted_1 = true;
        // let not_prompted_2 = true;
        // let not_prompted_3 = true;
        // let not_prompted_4 = true;

        while (true) {
            // defensive programming: yield back again if the the search result is not a building object
            // this should not be triggered in single domain processing
            if (!dlg.isOutputType('fm', 'building object1')(result)) {
                result = yield * dlg.expectType('fm', null);
                continue;
            }

            // say to user how many results I found
            // this was impossible in old genie
            if (dlg.getLastResultSize() > 3)
                dlg.say([`These are among the ${dlg.getLastResultSize()} results that I can find.`]);
            
            if (result.result_values[0].obj_type && result.result_values[0].obj_type.value == 'Smoke Detector' && dlg.ifExpressionContains('obj_type')) {
                dlg.say(['I see that you are searching for smoke detectors. FYI, they are very small on the GUI, you might have to look carefully.']);
            }
            
            // 1st follow-up:
            // When user finds something in this dictionary, initiate query on the corresponding value
            // NOTE: the natural language utterance does not contain which floor, but
            // the floor information will be retrieved using delta representation
            var projectionResults = dlg.ifSimpleProjectionQuery('org.fm', 'building_object1', false);
            if (projectionResults[0] &&
                projectionResults[1].length == 3 &&
                (projectionResults[1].indexOf('manufacturer') >= 0 && projectionResults[1].indexOf('model') >= 0 && projectionResults[1].indexOf('equip_spec') >= 0) &&
                dlg.getLastResultSize() <= 3 &&
                ifInDesiredMapping()[0]) {
                
                let returned_type = ifInDesiredMapping()[1];
                // const key = ifInDesiredMapping()[2];
                let beforeQuery = dlg.getLastCommand().prettyprint();
                result = (yield * dlg.initiateQuery(
                    `search for an object type ${returned_type}`,
                    `would you like to search for ${returned_type} nearby? In my system, these are correlated items.`,
                    false,
                    ['fm', 'building object1'],
                    getRidOfProjection
                )).result;
                let afterQuery = dlg.getLastCommand().prettyprint();
                if (dlg.getLastResultSize() > 0 && beforeQuery != afterQuery)
                    dlg.say([`This is a ${returned_type}.`]);
                delete dict[returned_type];
                continue;
            } 
            
            // 2nd follow-up: 
            // When the user already filters by room and smoke detector or fire alram manual pull station
            // prompt them to search for their manufacturer, specification, and model
            if (ThingTalk.Ast.getAllFilterNames(dlg.getLastCommand()).includes('room_id') && (
                dlg.getLastCommand().prettyprint().includes('Smoke Detector') ||
                dlg.getLastCommand().prettyprint().includes('Fire Alarm Manual Pull Station') ||
                dlg.getLastCommand().prettyprint().includes('Transformer') ||
                dlg.getLastCommand().prettyprint().includes('Electrical Panel'))) {
                result = (yield * dlg.initiateQuery(`what is its manufacturer, model, and specification?`,
                    `would you like to search for their manufaturer, model, and specification as well?`,
                    false,
                    ['fm', 'building object1']
                )).result;
                if (dlg.getLastResultSize() > 1 && dlg.getLastCommand().prettyprint().includes('Smoke Detector'))
                    dlg.say([`Smoke detectors in the same room share manufacturer, model, and specification.`]);
                if (dlg.getLastResultSize() > 1 && dlg.getLastCommand().prettyprint().includes('Electrical Panel'))
                    dlg.say([`Electrical panels in the same room share manufacturer, model, and specification.`]);
                continue;
            }

            // 3rd follow-up: 
            // When the user already filters by SA 265 and Hot Water Coil or RA 136 and Variable Air Volume Unit
            // prompt them to search for their manufacturer, specification, and model
            if ((dlg.getLastCommand().prettyprint().includes('Hot Water Coil') && dlg.getLastCommand().prettyprint().includes('SA 265')) ||
                (dlg.getLastCommand().prettyprint().includes('Variable Air Volume Unit') && dlg.getLastCommand().prettyprint().includes('RA 136') ||
                 dlg.getLastCommand().prettyprint().includes('RA 136'))) {
                result = (yield * dlg.initiateQuery(`what is its manufacturer, model, and specification?`,
                    `would you like to search for its manufaturer, model, and specification as well?`,
                    false,
                    ['fm', 'building object1']
                )).result;
                continue;
            }

            // some additional follow-up since it could be filtering by id:
            // this will be handled by a dlg helper function latere 
            if (dlg.getLastCommand().prettyprint().includes('id == "11985"') && 'Hot Water Coil' in dict) {
                result = (yield * dlg.initiateQuery(
                    `show me Variable Air Volume Unit in system RA 136`,
                    `would you like to search for variable air volume unit nearby? In my system, these are correlated items.`,
                    false,
                    ['fm', 'building object1'],
                    getRidOfProjection
                )).result;
                delete dict['Hot Water Coil'];
                continue
            }

            if (dlg.getLastCommand().prettyprint().includes('id == "12000"') && 'Variable Air Volume Unit' in dict) {
                result = (yield * dlg.initiateQuery(
                    `show me hot water coil in system SA 265`,
                    `would you like to search for hot water coil nearby? In my system, these are correlated items.`,
                    false,
                    ['fm', 'building object1'],
                    getRidOfProjection
                )).result;
                delete dict['Variable Air Volume Unit'];
                continue
            }
            if (dlg.getLastCommand().prettyprint().includes('id == "43382"') && 'Smoke Detector' in dict) {
                result = (yield * dlg.initiateQuery(
                    `show me smoke detectors in room number 402`,
                    `would you like to search for smoke detectors in the same room? In my system, these are correlated items.`,
                    false,
                    ['fm', 'building object1'],
                    getRidOfProjection
                )).result;
                delete dict['Smoke Detector'];
                continue
            }
            if (dlg.getLastCommand().prettyprint().includes('id == "42231"') && 'Electrical Panel' in dict) {
                result = (yield * dlg.initiateQuery(
                    `show me electric panels in room 109`,
                    `would you like to search for electric panels in the same room? In my system, these are correlated items.`,
                    false,
                    ['fm', 'building object1'],
                    getRidOfProjection
                )).result;
                delete dict['Electrical Panel'];
                continue
            }
            
            // old follow-up, still kept
            projectionResults = dlg.ifSimpleProjectionQuery('org.fm', 'building_object1', true);
            if ((projectionResults[0] && projectionResults[1].length < 3) &&
                (projectionResults[1].indexOf('manufacturer') >= 0 || projectionResults[1].indexOf('model') >= 0 || projectionResults[1].indexOf('equip_spec') >= 0)) {
                result = (yield * dlg.initiateQuery(`what is its manufacturer, model, and specification?`,
                    `would you like to search for its manufaturer, model, and specification as well?`,
                    false,
                    ['fm', 'building object1']
                )).result;
                continue;
            }


            // 3rd follow-up:
            // If user already uses a filter on floor,
            // while there are more than 10 returned results, propose a refined query to user.
            // in this case, if the user has not filtered by room,
            // prompt users “do you want to search a particular room”
            if (dlg.ifExpressionContains('floor') &&
                dlg.ifExpressionNotContains('room_type') &&
                dlg.getLastResultSize() !== null && dlg.getLastResultSize() >= 10) {
                result = (yield * dlg.proposeQueryRefinement(
                    ['room_type'],
                    "There are a lot of results. Is there a particular room or system you are looking for?",
                    false
                )).result;
                continue;
            }

            result = yield * dlg.expectType('fm', null);
        }
    }
}

function getRidOfProjection(node) {
    if (node.expression instanceof ThingTalk.Ast.ChainExpression &&
        node.expression.expressions.length == 1 &&
        node.expression.expressions[0] instanceof ThingTalk.Ast.ProjectionExpression) {
        node.expression.expressions[0] = node.expression.expressions[0].expression;
        return node;
    }
    return node
}

function appendProjection(node) {
    if (node.expression instanceof ThingTalk.Ast.ChainExpression &&
        node.expression.expressions.length == 1 &&
        node.expression.expressions[0] instanceof ThingTalk.Ast.ProjectionExpression) {
            node.expression.expressions[0].args.push('obj_type');
    }
    return node
}

// function getAllFilterNames(node) {
//     if (node.expression instanceof ThingTalk.Ast.ChainExpression &&
//         node.expression.expressions.length == 1 &&
//         node.expression.expressions[0] instanceof ThingTalk.Ast.ProjectionExpression) {
//             node.expression.expressions[0].args.push('obj_type');
//     }
//     return node
// }




class BMAgent extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'org.fm.agent';
        this.name = "BM Agent";
        this.description = "BM Search Agent";
        this._dialogueHandler = new BMAgentDialogueHandler(this.platform.locale, this.platform.timezone);
        console.log("BM agent loaded");
    }

    queryInterface(iface) {
        switch (iface) {
        case 'dialogue-handler':
            return this._dialogueHandler;

        default:
            return super.queryInterface(iface);
        }
    }
}
module.exports = BMAgent;
