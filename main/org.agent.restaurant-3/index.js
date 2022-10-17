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
const { DLGResultStatus } = require('genie-toolkit/dist/lib/dialogue-agent/geniescript');

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
        this._introMsg = "Hello there! I'm Genie. Everyone is Genie :)\n";
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
        let result = yield * self.dlg.initiateQuery('give me a french restaurant', 'Would you like to search for a French restaurant?');
        console.log(result);
        if (result.status === DLGResultStatus.SUCCESS ) {
            const place = result.result.value.id.display
            yield * self.dlg.initiateAction(`I'd like to book ${place});`, `Would you like to book ${place}?`);
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
