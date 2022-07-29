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

class RestaurantAgentDialogueGenHandler2 extends Genie.DialogueAgent.Geniescript.GeniescriptAgent {
    /**
     *
     * @param {string} locale
     * @param {string} timezone
     */
    constructor(locale, timezone) {
        super(Tp.DialogueHandler.Priority.PRIMARY, 'org.agent.restaurant2', '', 'org.agent.restaurant2');
        this._locale = locale;
        this._timezone = timezone;
        this._ = RestaurantAgent2.gettext.gettext;
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
        while (true) {
            let blob = yield * self.dlg.expect(
                new Map([]), 
                (reply) => (
                    Genie.ThingTalkUtils.isOutputType('yelp', 'restaurant')(reply) || 
                    Genie.ThingTalkUtils.isOutputType('weather', 'current')(reply)
                ),
                (reply) => reply,
                "I'm your restaurant booking helper. Would you like to find a restaurant?"
            );
            if (Genie.ThingTalkUtils.isOutputType('yelp', 'restaurant')(blob)) {
                const count = blob.result_values.filter((item) => item.review_count >= 9000 && item.rating >= 4).length;
                const places = blob.result_values.map((item) => { return {id: item.id.display, geo: item.geo }});
                if (count === blob.result_values.length) {
                    self.dlg.say([`They all seem very popular, which one would you like to book?`]);
                    continue;
                }
                if (places) {
                    self.dlg.say(["Would you like to book an Uber ride to get there?"]);
                    const consent = yield * self.dlg.expect(new Map([
                        ["\\b(yes|yeah|yep|sure|go ahead)\\b", function * () { return true }], 
                        ["\\b(no|nah|nope)\\b", function * () { return false }]
                    ]));
                    // TODO: agent initiates uber request. Use weather as example for now.
                    if (consent) {
                        // Use a specific location to avoid slot-filling
                        blob.program = `@org.thingpedia.weather.current(location=new Location("palo alto"));`;
                        yield * self.dlg.execute(blob.program);
                    } else {
                        // Need this line if we want the phrase to be repeated
                        self.dlg.say(["I'm your restaurant booking helper. Would you like to find a restaurant?"]);
                    }
                }
            } else if (Genie.ThingTalkUtils.isOutputType('weather', 'current')(blob)) {
                const regex = /rain/ig;
                if (!blob.messages[0].match(regex)) {
                    const loc = blob.result_values[0].location.display;
                    self.dlg.say([`Weather in ${loc} is not too bad, how about we find a place to eat?`]);
                }
            }
        }
    }
}

class RestaurantAgent2 extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'org.agent.restaurant2';
        this.name = "Restaurant Agent";
        this.description = "Restaurant Search Agent";
        this._dialogueHandler = new RestaurantAgentDialogueGenHandler2(this.platform.locale, this.platform.timezone);
        console.log("restaurant2 agent loaded");
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
