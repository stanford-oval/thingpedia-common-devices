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

const AgentDevice = require('../../scripts/lib/agent-device');
const AgentDialogueGenHandler = require('../../scripts/lib/agent-handler');
const Tp = require('thingpedia');
const XMLHttpRequest = require("xmlhttprequest").XMLHttpRequest;
const user = 'George';
const gptServer = 'http://127.0.0.1:5000';


class RestaurantReviewsAgent extends AgentDialogueGenHandler {

    constructor(locale, timezone) {
        super(locale, timezone, 'org.agent.intercept_yelp_agent');
        this._ = RestaurantAgent2.gettext.gettext;
    }

    async *logic() {
        let dlg = this.dlg; // this solves a dlg package issue. You can simply write `dlg.` below

        while (true) {
            let command = await dlg.dialogueHandler._loop.nextCommand();
            let preProcessedCommand = gptPreProcess(command);
            let genieResult = await dlg.executeCSP(preProcessedCommand);

            // retrieve reviews associated with the recommended restaurant
            const res = dlg.getLastResult();
            let reviews = [];
            if (res) {
                const place = res.results[0];
                reviews = await getReviews(place.raw.id);
            }

            let sendToUser = gptPostProcess(genieResult, reviews);
            await dlg.dialogueHandler._loop._sendAgentReply(sendToUser);
        }
    }
}

async function getReviews(id) {
    const url = `https://api.yelp.com/v3/businesses/${id}/reviews?sort_by=yelp_sort`;
    // console.log(`url for reviews: ${url}`);

    const data = await Tp.Helpers.Http.get(url, {
        auth: 'Bearer 4Kogpp7gIfLc0V5ZZBGs2kk5PInQZGq0Oo-jc2hGXYDHwpQ_vZHbhKKQPae6xtusSvTBFBdZIzvJp3iKYmEcPuDCAWZ8IieK5PSguLeHSeXHSKXT9v5oBoL3VffIY3Yx'
    });

    const response = JSON.parse(data);
    const res = response.reviews.map((x) => x.text);
    return res;
}

function gptPreProcess(command) {
    const Http = new XMLHttpRequest();
    const userUrl = encodeURIComponent(user); 
    const utterance = encodeURIComponent(command.utterance);
    const url = `${gptServer}/preprocess?user=${userUrl}&utterance=${utterance}`;

    // console.log(`Calling GPT server with ${url}`);
    Http.open("GET", url, false);
    let res;
    Http.onreadystatechange = (e) => {
        res = Http.responseText;
    };
    Http.send();
    command.utterance = res;

    return command;
}

function gptPostProcess(result, reviews) {
    const Http = new XMLHttpRequest();
    const userUrl = encodeURIComponent(user); 
    const genieUtterance = encodeURIComponent(result.messages[0]); 
    const genieReviews = encodeURIComponent(JSON.stringify(reviews));
    const url = `${gptServer}/postprocess?genieutterance=${genieUtterance}&geniereviews=${genieReviews}&user=${userUrl}`;

    // console.log(`Calling GPT server with ${url}`);
    Http.open("GET", url, false);
    let res;
    Http.onreadystatechange = (e) => {
        res = Http.responseText;
    };
    Http.send();
    result.messages[0] = res;

    return result;
}



class RestaurantAgent2 extends AgentDevice {
    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'org.agent.intercept_yelp_agent';
        this.name = "Restaurant Agent";
        this.description = "Restaurant Search Agent";
        this._dialogueHandler = new RestaurantReviewsAgent(this.platform.locale, this.platform.timezone);
    }

}
module.exports = RestaurantAgent2;
