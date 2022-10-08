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

class RadioPlayerDialogueHandler extends Genie.DialogueAgent.Geniescript.GeniescriptAgent {
    /**
     *
     * @param {string} locale
     * @param {string} timezone
     */
    constructor(locale, timezone) {
        super(Tp.DialogueHandler.Priority.PRIMARY, 'org.agent.radio-player', '', 'org.agent.radio-player');
        this._locale = locale;
        this._timezone = timezone;
        this._ = RadioPlayerAgent.gettext.gettext;
        this._introMsg = "Hello there! I'm your radio navigator. How may I help you?";
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
                '@com.tunein.station();',
                'Would you like to search for a station?',
                ['tunein', 'station']);
            for (const station of blob.result_values) {
                const program = `@com.tunein.radio_play(id='${station.id.toString()}');`;
                console.log(program);
                yield * self.dlg.proposeAndExecuteAction(
                    program,
                    `Would you like to listen to the amazing ${station.id.value}?`);
            }
        }
    }
}

class RadioPlayerAgent extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'org.agent.radio-player';
        this.name = "Radio Player agent";
        this.description = "Radio Player Agent";
        this._dialogueHandler = new RadioPlayerDialogueHandler(this.platform.locale, this.platform.timezone);
        console.log("radio-player agent loaded");
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
module.exports = RadioPlayerAgent;
