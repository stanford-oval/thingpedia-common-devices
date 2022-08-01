// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of org.agent.restaurant
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
        this._introMsg = "Hello there! I'm your restaurant booking helper. How may I help you?\n" + 
        "You can say things like 'find me a restaurant', " +
        "'I want chinese food' or 'give me a good restaurant nearby'.";
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
        let self = this;
        self.dlg.say(this._introMsg);
        while (true)
            yield * self.dlg.expect(
                new Map([]),
                Genie.ThingTalkUtils.isOutputType('yelp', 'restaurant'),
                (reply) => reply,
                "I'm your restaurant booking helper. Would you like to find a restaurant?"
            );
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
