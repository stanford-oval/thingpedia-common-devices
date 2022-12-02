// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2021 The Board of Trustees of the Leland Stanford Junior University
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
"use strict";

const Tp = require('thingpedia');

module.exports = class JokeApi extends Tp.BaseDevice {
    async get_get({ query }) {
        if (query) {
            query = query.toLowerCase();
            const parsed = JSON.parse(await Tp.Helpers.Http.get(`https://icanhazdadjoke.com/search?term=${encodeURIComponent(query)}`, {
                accept: 'application/json'
            }));
            // eliminate jokes that don't actually contain the keywords
            const filtered = parsed.results.filter((joke) => joke.joke.toLowerCase().indexOf(query) >= 0);
            if (filtered.length === 0) {
                const err = new Error(`No jokes returned`);
                err.code = 'no_joke_available';
                throw err;
            }

            // return a random one
            const choice = filtered[Math.floor(Math.random() * filtered.length)];
            return [{
                id: choice.id,
                text: choice.joke
            }];
        } else {
            const parsed = JSON.parse(await Tp.Helpers.Http.get(`https://icanhazdadjoke.com`, {
                accept: 'application/json'
            }));
            return [{
                id: parsed.id,
                text: parsed.joke
            }];
        }
    }
};
