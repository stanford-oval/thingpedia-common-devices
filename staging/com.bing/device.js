// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

module.exports = class BingClass extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'com.bing';
        this.name = "Bing Search";
        this.description = "Search the web, using Bing";
    }

    get_web_search({query}) {
        const locale = this.engine.platform.locale;
        const language = locale.split('-')[0];

        const url = `https://api.cognitive.microsoft.com/bing/v5.0/search?count=5&mkt=${locale}&setLang=${language}&q=${encodeURIComponent(query)}&responseFilter=Webpages`;
        return Tp.Helpers.Http.get(url, {
            extraHeaders: { 'Ocp-Apim-Subscription-Key': this.constructor.metadata.auth.subscription_key }
        }).then((response) => {
            let parsedResponse = JSON.parse(response);
            return parsedResponse.webPages.value.map((result) => {
                return ({
                    query: query,
                    title: result.name,
                    description: result.snippet,
                    link: result.url
                });
            });
        });
    }

    get_image_search({query}, filters) {
        const locale = this.engine.platform.locale;
        const language = locale.split('-')[0];

        let url = `https://api.cognitive.microsoft.com/bing/v5.0/images/search?count=5&mkt=${locale}&setLang=${language}&q=${encodeURIComponent(query)}`;
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
