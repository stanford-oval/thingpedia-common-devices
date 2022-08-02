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
const Genie = require('genie-toolkit');

class RestaurantAgentDialogueGenHandler2 extends Genie.DialogueAgent.Geniescript.GeniescriptAgent {
    /**
     *
     * @param {string} locale
     * @param {string} timezone
     */
    constructor(locale, timezone) {
        super(Tp.DialogueHandler.Priority.PRIMARY, 'org.agent.restaurant-2', '', 'org.agent.restaurant-2');
        this._locale = locale;
        this._timezone = timezone;
        this._ = RestaurantAgent2.gettext.gettext;
        this._introMsg = "Hello there! I'm your restaurant booking helper. How may I help you?\n" + 
        "You can say things like 'find me a restaurant', " +
        "'I want chinese food' or 'give me a good restaurant nearby'.";
        this._prompt = "Would you like to find a restaurant?";
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
        while (true) {
            let blob = yield * self.dlg.expect(
                new Map([]), 
                (reply) => Genie.ThingTalkUtils.isOutputType('yelp', 'restaurant')(reply),
                (reply) => reply,
                this._prompt
            );
            if (Genie.ThingTalkUtils.isOutputType('yelp', 'restaurant')(blob)) {
                const places = blob.result_values.map((item) => { return {id: item.id.display, geo: item.geo }});
                for (const place of places) {
                    self.dlg.say([`Would you like an Uber ride to ${place.id}?`]);
                    const consent = yield * self.dlg.expect(
                        new Map([
                            ["\\b(yes|yeah|yep|sure|go ahead)\\b", function * () { return true }], 
                            ["\\b(no|nah|nope)\\b", function * () { return false }]
                        ]), 
                        null, 
                        null, 
                        `Would you like an Uber ride to ${place.id}?`);
                    if (consent) {
                        // agent initiates uber request.
                        const lat = place.geo.x;
                        const lon = place.geo.y;
                        blob.program = `@com.uber.mock.request(start=$location.current_location, end=new Location(${lat}, ${lon}));`;
                        const ret = yield * self.dlg.execute(blob.program);
                        if (ret)
                            break;
                    }
                }
                self.dlg.say([this._prompt]);
            }
        }
    }
}

class RestaurantAgent2 extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'org.agent.restaurant-2';
        this.name = "Restaurant Agent";
        this.description = "Restaurant Search Agent";
        this._dialogueHandler = new RestaurantAgentDialogueGenHandler2(this.platform.locale, this.platform.timezone);
        console.log("restaurant-2 agent loaded");
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
module.exports = RestaurantAgent2;
