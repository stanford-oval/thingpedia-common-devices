// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of org.kqed
//
// Copyright 2022 undefined <undefined>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');
const interpolate = require('string-interp');
const Genie = require('genie-toolkit');

class RestaurantAgentDialogueGenHandler extends Genie.DialogueAgent.Geniescript.GeniescriptAgent {
    /**
     *
     * @param {string} locale
     * @param {string} timezone
     */
    constructor(locale, timezone) {
        super(Tp.DialogueHandler.Priority.PRIMARY, 'org.agent.restaurant', '', 'org.agent.restaurant');
        this._locale = locale;
        this._timezone = timezone;
        this._ = RestaurantAgent.gettext.gettext;
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

    _greet(msg) {
        return {
            messages: [this._(msg)],
            context: 'null',
            agent_target: '$dialogue @org.thingpedia.dialogue.transaction.greet;',
            expecting: null,
        };
    }

    async initialize(initialState, showWelcome) {
        await super.initialize();
        if (initialState)
            this._lastQuerySuggestion = initialState.lastQuerySuggestion;
        const Msg = "\n\nHello there! I'm your restaurant agent. How may I help you?" + 
                    "\nYou can say things like 'find me a restaurant' or " +
                    "\n'I want chinese food' or 'give me a good restaurant nearby'.";
        if (showWelcome)
            return this._greet(Msg);
        else
            return null;
    }

    reset() {
        this._lastQuerySuggestion = null;
    }

    async *yes_no(prompt) {
        let self = this;
        return yield * self.dlg.expect(new Map(Object.entries({
            "\\b(yes|yeah|yep|sure|go ahead)\\b": async function() {
                return true;
            },
            "\\b(no|nah|nope)\\b": async function() {
                return false;
            }
        })), prompt);
    }

    async *logic() {
        let self = this;
        yield * self.dlg.expect(new Map(Object.entries({
            ".*": ( async function*() {
                if (yield * self.yes_no("Do you want me to book it?"))
                    self.dlg.say(
                        [self._interp(self._("what restaurant would you like?"), {})]
                    );
                else
                    self.dlg.say(
                        [self._interp(self._("OK. Let me know if you need any help."), {})]
                    );
            })
        })), "Hi there! I'm your restaurant finder. What do you want me to do?");
    }
}

class RestaurantAgent extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'org.agent.restaurant';
        this.name = "Restaurant Agent";
        this.description = "Restaurant Search Agent";
        this._dialogueHandler = new RestaurantAgentDialogueGenHandler(this.platform.locale, this.platform.timezone);
        console.log("restaurant agent loaded");
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
module.exports = RestaurantAgent;
