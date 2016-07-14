// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

const API_KEY = '09c6cd0bfeef4179bbdfaa9b68755b8b';
const URL = 'https://api.cognitive.microsoft.com/bing/v5.0/search?count=5&mkt=en-US&setLang=en&q=%s&responseFilter=Webpages';

module.exports = new Tp.ChannelClass({
    Name: 'BingWebSearchChannel',

    formatEvent(event, filters) {
        var title = event[1];
        var description = event[2];
        var url = event[3];

        return [{ type: 'rdl', displayTitle: title, displayText: description,
                  callback: url, webCallback: url }];
    },

    invokeQuery(filters) {
        var query = filters[0];
        if (typeof query !== 'string')
            throw new Error('query parameter is required');

        var url = URL.format(encodeURIComponent(query));

        return Tp.Helpers.Http.get(url, { extraHeaders: {
            'Ocp-Apim-Subscription-Key': API_KEY
        } }).then(function(response) {
            var results = JSON.parse(response);

            return results.webPages.value.map(function(result) {
                return [query, result.name  , result.snippet, result.url];
            });
        });
    }
});
