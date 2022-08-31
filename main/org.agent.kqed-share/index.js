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

class KqedShareAgentDialogueGenHandler extends Genie.DialogueAgent.Geniescript.GeniescriptAgent {
    /**
     *
     * @param {string} locale
     * @param {string} timezone
     */
    constructor(locale, timezone) {
        super(Tp.DialogueHandler.Priority.PRIMARY, 'org.agent.kqed-share', '', 'org.agent.kqed-share');
        this._locale = locale;
        this._timezone = timezone;
        this._ = KqedShareAgent.gettext.gettext;
        this._introMsg = "Hello there! You can start playing KQED live program by saying 'Play KQED'";
        this._prompt = "You can start playing KQED live programs by saying 'Play KQED'";
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
            let results;
            let blob = yield * self.dlg.expect(
                new Map([
                    // [
                    //     "kqed-play", 
                    //     (async function*() {
                    //         const prog = "@org.kqed.kqed_podcasts();";
                    //         results = yield * self.dlg.execute(prog);
                    //     })
                    // ],
                ]), 
                (reply) => true,
                (reply) => reply,
                this._prompt
            );
            const output = blob !== undefined ? blob : results;
            if (Genie.ThingTalkUtils.isOutputType('kqed', 'action/kqed_play')(output)) {
                output.program = `@com.twitter.send_direct_message(message="test", to="jmhw0123"^^tt:username);`;
                const ret = yield * self.dlg.execute(output.program);
                if (ret)
                    break;
            } else if (Genie.ThingTalkUtils.isOutputType('kqed', 'kqed_podcasts')(output)) { 
                self.dlg.say([this._prompt]);
            }
        }
    }
}

class KqedShareAgent extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'org.agent.kqed-share';
        this.name = "KQED Share Agent";
        this.description = "KQED Share Agent";
        this._dialogueHandler = new KqedShareAgentDialogueGenHandler(this.platform.locale, this.platform.timezone);
        console.log("kqed-share agent loaded");
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
module.exports = KqedShareAgent;
