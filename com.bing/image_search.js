// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const Tp = require('thingpedia');

const API_KEY = '09c6cd0bfeef4179bbdfaa9b68755b8b';
const URL = 'https://api.cognitive.microsoft.com/bing/v5.0/images/search?count=5&mkt=en-US&setLang=en&q=%s';

module.exports = new Tp.ChannelClass({
    Name: 'BingWebSearchChannel',

    formatEvent(event, filters) {
        var title = event[1];
        var url = event[2];
        var websiteUrl = event[3];

        return [{ type: 'rdl', displayTitle: title,
                  callback: websiteUrl, webCallback: websiteUrl },
                { type: 'picture', url: url }];
    },

    invokeQuery(filters) {
        var query = filters[0];
        if (typeof query !== 'string')
            throw new Error('query parameter is required');

        var url = URL.format(encodeURIComponent(query));
        var width = filters[5];
        if (width !== undefined && width !== null)
            url += '&width=' + width;
        var height = filters[6];
        if (height !== undefined && height !== null)
            url += '&height=' + height;

        return Tp.Helpers.Http.get(url, { extraHeaders: {
            'Ocp-Apim-Subscription-Key': API_KEY
        } }).then(function(response) {
            var results = JSON.parse(response);

            return results.value.map(function(result) {
                return [query, result.name, result.contentUrl, result.hostPageDisplayUrl];
            });
        });
    }
});
