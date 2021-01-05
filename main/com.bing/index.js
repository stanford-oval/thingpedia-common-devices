// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016-2020 The Board of Trustees of the Leland Stanford Junior University
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

module.exports = class BingClass extends Tp.BaseDevice {
    get_web_search({ query }, hints) {
        const locale = this.platform.locale;
        const language = locale.split('-')[0];
        const count = hints.limit && !hints.sort ? hints.limit : 5;

        const url = `https://api.cognitive.microsoft.com/bing/v7.0/search?count=${count}&mkt=${locale}&setLang=${language}&q=${encodeURIComponent(query)}&responseFilter=Webpages`;
        return Tp.Helpers.Http.get(url, {
            extraHeaders: { 'Ocp-Apim-Subscription-Key': this.constructor.metadata.auth.subscription_key }
        }).then((response) => {
            let parsedResponse = JSON.parse(response);
            return parsedResponse.webPages.value.map((result) => {
                return ({
                    query: query,
                    title: result.name,
                    description: result.snippet,
                    link: result.url,
                });
            });
        });
    }

    get_image_search({query}, hints) {
        const locale = this.platform.locale;
        const language = locale.split('-')[0];
        const count = hints.limit && !hints.sort ? hints.limit : 5;

        let url = `https://api.cognitive.microsoft.com/bing/v7.0/images/search?count=${count}&mkt=${locale}&setLang=${language}&q=${encodeURIComponent(query)}`;

        for (const filter of hints.filter || []) {
            if (filter[0] === 'width') {
                if (filter[1] === '==')
                    url += `&width=${filter[2]}`;
                else if (filter[1] === '>=')
                    url += `&minWidth=${filter[2]}`;
                else if (filter[1] === '<=')
                    url += `&maxWidth=${filter[2]}`;
            } else if (filter[0] === 'height') {
                if (filter[1] === '==')
                    url += `&height=${filter[2]}`;
                else if (filter[1] === '>=')
                    url += `&minHeight=${filter[2]}`;
                else if (filter[1] === '<=')
                    url += `&maxHeight=${filter[2]}`;
            }
        }
        return Tp.Helpers.Http.get(url, {
            extraHeaders: { 'Ocp-Apim-Subscription-Key': this.constructor.metadata.auth.subscription_key }
        }).then((response) => {
            let parsedResponse = JSON.parse(response);
            return parsedResponse.value.map((result) => {
                return ({
                    query: query,
                    title: result.name,
                    picture_url: result.contentUrl,
                    link: result.hostPageUrl,
                    width: result.width,
                    height: result.height
                });
            });
        });

    }
};
