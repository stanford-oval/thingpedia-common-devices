// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Silei Xu <silei@stanford.edu>
//
// See COPYING for details

const Tp = require('thingpedia');
const URL_TAG = 'http://api.giphy.com/v1/gifs/random?api_key=dc6zaTOxFJmzC&tag='

module.exports = new Tp.ChannelClass({
    Name: "GetGifWithTag",

    _init: function(engine, device) {
        this.parent();
        this.device = device;
        this.url = URL_TAG;
    },

    formatEvent: function(event, filters) {
        return [{type: 'picture', url: event[1]}];
    },

    invokeQuery: function(filters) {
        var tag = filters[0];
        var url = this.url + tag;
        return Tp.Helpers.Http.get(url).then(function(response) {
            var parsed = JSON.parse(response);
            return [[filters[0], parsed["data"]["image_url"]]];
        });
    }
});