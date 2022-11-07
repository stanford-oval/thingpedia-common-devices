// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of org.agent.restaurant
//
// Copyright 2022 undefined <undefined>
//
// See LICENSE for details
"use strict";

const Genie = require('genie-toolkit');
const AgentDevice = require('../../scripts/lib/agent-device');
const AgentDialogueGenHandler = require('../../scripts/lib/agent-handler');

class R extends AgentDialogueGenHandler {

    constructor(locale, timezone) {
        super(locale, timezone, 'org.agent.restaurant');
        // TODO: What's this for?
        this._ = RestaurantAgent.gettext.gettext;
    }

    async *logic() {
        let self = this;
        self.dlg.say("Hi.");
        while (true)
            yield * self.dlg.expect(
                new Map([
                    ["qwert", ( async function*() {
                        console.log("Hi Hi.")
                    })]
                ]),
                Genie.ThingTalkUtils.isOutputType('yelp', 'restaurant'),
                (reply) => reply,
                "Any restaurant you would like to dine in for today?"
            );
    }
}


class RestaurantAgent extends AgentDevice {
    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'org.agent.restaurant';
        this.name = "Restaurant Agent";
        this.description = "Restaurant Search Agent";
        this._dialogueHandler = new R(this.platform.locale, this.platform.timezone);
        console.log("restaurant agent loaded");
    }
}

module.exports = RestaurantAgent;
