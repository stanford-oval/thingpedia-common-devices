/* eslint-disable brace-style */
// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2019-2023 The Board of Trustees of the Leland Stanford Junior University
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

const { Ast } = require('thingtalk');
const AgentDevice = require('../../scripts/lib/agent-device');
const AgentDialogueGenHandler = require('../../scripts/lib/agent-handler');

const Attraction = Symbol("Attraction");
const Hotel = Symbol("Hotel");
const Restaurant = Symbol("Restaurant");
const _Taxi = Symbol("Taxi");
const Train = Symbol("Train");

class MultiwozDialogAgent extends AgentDialogueGenHandler {

    constructor(locale, timezone) {
        // construtor initializers
        // please keep these
        super(locale, timezone, 'org.agent.multiwoz');
        this._ = MultiwozAgent.gettext.gettext;

        // this stores attributes of interest and their corresponding NL
        this.followUpAttributes = {
            "price_range": "price range",
            "type": "attraction type",
            "area": "part of town",
            "day": "day in the week",
            "destination": "destination"
        };
    }

    async *logic() {
        let dlg = this.dlg; // this solves a dlg package issue. You can simply write `dlg.` below

        dlg.say("Hey there, I am your MultiwWoz assistant, at your service");
        // immediately yields to the user, regaining the floor when user's commands are executed
        yield * dlg.expect(() => true, true);

        // eslint-disable-next-line no-constant-condition
        while (true) {
            let lastQueryCharacterization = this.ifLastIsQuery();
            
            // 1st follow-up: once found a place, recommend the user to book it
            // applicable to Attraction, Hotel, and Train
            // only do this when there are 1 or 2 results
            let lastResultList = dlg.getLastResult() ? dlg.getLastResult().results : [];
            if (lastResultList.length > 0 && lastResultList.length <= 3 &&
                [Attraction, Hotel, Train, Restaurant].includes(lastQueryCharacterization)) {
                let firstResult = lastResultList[0].raw;

                // REVIEW: here, we don't care about result.status, so we neglect the third argument
                yield * dlg.propose(
                    `I'd like to book ${firstResult.id.display}`,
                    `Shall I make a reservation for ${firstResult.id.display}?`,
                    'null', false);
            }

            // 2nd follow-up: ask the user to revise the query
            // applicable to Attraction, Hotel, Train, and Restaurant
            // only do this when there are more than 3 results
            else if (lastResultList.length > 3) {
                // [Attraction, Hotel, Train, Restaurant].includes(lastQueryCharacterization)) {
                let proposals;
                if ((proposals = dlg.determineQueryRefinement("uk.ac.cam.multiwoz.Attraction.Attraction", ["price_range", "type"])).length > 0)
                    yield * dlg.proposeQueryRefinement(proposals, `There are also other results. Do you have a specific ${this.constructReply(proposals)} in mind?`, true);
                else if ((proposals = dlg.determineQueryRefinement("uk.ac.cam.multiwoz.Hotel.Hotel", ["price_range", "area"])).length > 0)
                    yield * dlg.proposeQueryRefinement(proposals, `There are also other results. Do you have a specific ${this.constructReply(proposals)} in mind?`, true);
                else if ((proposals = dlg.determineQueryRefinement("uk.ac.cam.multiwoz.Train.Train", ["day", "destination"])).length > 0)
                    yield * dlg.proposeQueryRefinement(proposals, `I can find many results. What ${this.constructReply(proposals)} would you like?`, true);
                else if ((proposals = dlg.determineQueryRefinement("uk.ac.cam.multiwoz.Restaurant.Restaurant", ["price_range", "area"])).length > 0)
                    yield * dlg.proposeQueryRefinement(proposals, `I can find many results. Which ${this.constructReply(proposals)} are you looking for?`, true);
                continue;
            }

            // otherwise, just yield back to user
            // dlg.say("Do you need any other help?");
            yield * dlg.expect(() => true, true);
        }
    }

    ifLastIsQuery() {
        let command = this.dlg.getLastCommand();
        let invocation = Ast.getAllInvocationExpression(command);
        
        // we assume that there is no multiple invocations (no joins and parameter passing)
        if (invocation.length > 1)
            return false;
        
        if (invocation[0].prettyprint().includes("uk.ac.cam.multiwoz.Attraction.Attraction"))
            return Attraction;
        if (invocation[0].prettyprint().includes("uk.ac.cam.multiwoz.Train.Train"))
            return Train;
        if (invocation[0].prettyprint().includes("uk.ac.cam.multiwoz.Hotel.Hotel"))
            return Hotel;
        if (invocation[0].prettyprint().includes("uk.ac.cam.multiwoz.Restaurant.Restaurant"))
            return Restaurant;
        
        return false;
    }

    // concatenate all values in @param fields with "or" according to mappings in this.followUpAttributes
    // for instance, ["price_range", "area"] will become "price range or part of town"
    constructReply(fields) {
        if (fields.length === 1)
            return this.followUpAttributes[fields[0]];
        
        let res = "";
        for (let i = 0; i < fields.length - 2 ; i ++)
            res += this.followUpAttributes[fields[i]] + ", ";
        res += this.followUpAttributes[fields[fields.length - 2]] + " ";
        res += "or " + this.followUpAttributes[fields[fields.length - 1]];
        return res;
    }
}

class MultiwozAgent extends AgentDevice {
    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'org.agent.multiwoz';
        this.name = "Multiwoz Agent";
        this.description = "A Genie agent modeling the MultiWoz Wizard-of-Woz agent";
        this._dialogueHandler = new MultiwozDialogAgent(this.platform.locale, this.platform.timezone);
    }

}
module.exports = MultiwozAgent;
