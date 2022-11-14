"use strict";

const Tp = require('genie-toolkit/node_modules/thingpedia');
const interpolate = require('string-interp');
const Genie = require('genie-toolkit');

class AgentDialogueGenHandler extends Genie.DialogueAgent.Geniescript.GeniescriptAgent {
    
    _lastQuerySuggestion;

    /**
     *
     * @param {string} locale
     * @param {string} timezone
     */
    constructor(locale, timezone, uniqueId) {
        super();
        this.priority = Tp.DialogueHandler.Priority.PRIMARY;
        this.icon = uniqueId;
        this.user_target = '';
        this.skill_name = uniqueId;
        this._locale = locale;
        this._timezone = timezone;
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

    async *logic() {}
}

module.exports = AgentDialogueGenHandler;