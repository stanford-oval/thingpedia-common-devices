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

class RestaurantAgentDialogueGenHandler3 extends Genie.DialogueAgent.Geniescript.GeniescriptAgent {
    /**
     *
     * @param {string} locale
     * @param {string} timezone
     */
    constructor(locale, timezone) {
        super(Tp.DialogueHandler.Priority.PRIMARY, 'org.agent.restaurant-3', '', 'org.agent.restaurant-3');
        this._locale = locale;
        this._timezone = timezone;
        this._ = RestaurantAgent3.gettext.gettext;
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
            let blob = yield * self.dlg.proposeQuery(
                '@com.yelp.restaurant() filter contains(cuisines, "chinese"^^com.yelp:restaurant_cuisine("Chinese"));',
                'Would you like to search for a Chinese restaurant?',
                ['yelp', 'restaurant']);
            const places = blob.result_values.map((item) => { return {id: item.id.display, geo: item.geo }});
            const place = places[0];
            yield * self.dlg.proposeAndExecuteAction(
                `@com.uber.mock.request(start=$location.current_location, end=new Location(${place.geo.x}, ${place.geo.y}));`,
                `Would you like a uber ride to ${place.id}`);
        }
    }
}

class RestaurantAgent3 extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'org.agent.restaurant-3';
        this.name = "Restaurant Agent";
        this.description = "Restaurant Search Agent";
        this._dialogueHandler = new RestaurantAgentDialogueGenHandler3(this.platform.locale, this.platform.timezone);
        console.log("restaurant-3 agent loaded");
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
module.exports = RestaurantAgent3;
