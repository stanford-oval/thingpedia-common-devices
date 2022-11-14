// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2019-2022 The Board of Trustees of the Leland Stanford Junior University
//
// Redistribution and use in source and binary forms, with or
// without modification, are permitted provided that the following
// conditions are met:
//
// 1. Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above
//    copyright notice, this list of conditions and the following
//    disclaimer in the documentation and/or other materials
//    provided with the distribution.
// 3. Neither the name of the copyright holder nor the names of its
//    contributors may be used to endorse or promote products derived
//    from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
// INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
// SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
// HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
// STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED
// OF THE POSSIBILITY OF SUCH DAMAGE.
//
// Author: Shicheng Liu <shicheng@cs.stanford.edu>
"use strict";

const { DlgStatus } = require('genie-toolkit/dist/lib/dialogue-agent/geniescript');
const AgentDevice = require('../../scripts/lib/agent-device');
const AgentDialogueGenHandler = require('../../scripts/lib/agent-handler');

class RestaurantBookingAgent extends AgentDialogueGenHandler {

    constructor(locale, timezone) {
        super(locale, timezone, 'org.agent.restaurant');
        this._ = RestaurantAgent.gettext.gettext;
    }

    /**
     * This restaurant booking agent would propose user to search for a French restaurant.
     * After user finds a restaurant, it would propose the user to book it.
     */
    async *logic() {
        let dlg = this.dlg; // this solves a dlg package issue. You can simply write `dlg.` below
        dlg.say("Hey there, I am your restaurant booking assistant, at your service");

        // waitForAck sets to true means that this waits for user's explicit ack before proposing booking a restaurant
        let result = yield * dlg.propose(
            'give me a french restaurant', 'Would you like to search for a French restaurant?',
            'com.yelp:restaurant', true);
        if (result.status === DlgStatus.SUCCESS ) {
            const place = result.results[0].id.display;
            yield * dlg.propose(`I'd like to book ${place});`, `Would you like to book ${place}?`);
        }
    }
}

class RestaurantAgent extends AgentDevice {
    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'org.agent.restaurant';
        this.name = "Restaurant Agent";
        this.description = "Restaurant Search Agent";
        this._dialogueHandler = new RestaurantBookingAgent(this.platform.locale, this.platform.timezone);
        console.log("restaurant-3 agent loaded");
    }

}
module.exports = RestaurantAgent;
