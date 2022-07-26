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
        this._reply = "I'm your restaurant booking helper. would you like to find a restaurant?";
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

    _generate_followup(reply) {
        if (reply.raw_results && Object.keys(reply.raw_results).length) {
            const [appCall, blob] = reply.raw_results[0];
            const [appName, funcName] = appCall.split(":");
            console.log(blob);
            if (appName.includes("yelp")) {
                switch (funcName) {
                    case "restaurant": {
                        if (blob.review_count > 500 && blob.rating >= 3)
                            this._reply = "They seem very popular, which one would you like to book?";
                        else if (blob.geo)
                            this._reply = "Would you like to book your Uber ride to get there?";
                        else
                            this._reply = "Which restaurant would you like to book?";
                        break;
                    }
                    default: {
                        this._reply = "I'm your restaurant booking helper. Would you like to find a restaurant?";
                        break;
                    }
                }
            } else if (appName.includes("weather")) {
                switch (funcName) {
                    case "current": {
                        this._reply = "Would you like to find a restaurant there?";
                        break;
                    }
                    default: {
                        this._reply = "I'm your restaurant booking helper. Would you like to find a restaurant?";
                        break;
                    }
                }
            } else {
                return false;
            }
            return true;
        } else 
            return false;
    }

    async *logic() {
        let self = this;
        yield * self.dlg.expect(new Map(Object.entries({

        })), 
        new Map([
            [
                (reply) => reply === null,
                (
                    async function*() {
                        self.dlg.say(self._reply);
                    }
                )
            ],
            [
                (reply) => this._generate_followup(reply),
                (
                    async function*() {
                        self.dlg.say(self._reply);
                    }
                )
            ],
            [
                (reply) => true,
                (
                    async function*() {
                        self.dlg.say(self._reply);
                    }
                )
            ],
        ]));
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
