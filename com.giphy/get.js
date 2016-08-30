// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Silei Xu <silei@stanford.edu>
//
// See COPYING for details

const Tp = require('thingpedia');
const URL_RANDOM = 'http://api.giphy.com/v1/gifs/random?api_key=dc6zaTOxFJmzC';

module.exports = new Tp.ChannelClass({
    Name: "GetRandomGif",

    _init: function(engine, device) {
        this.parent();
        this.device = device;
        this.url = URL_RANDOM;
    },

    formatEvent: function(event, filters) {
        return [{type: 'picture', url: event[0]}];
    },

    invokeQuery: function(filters) {
        return Tp.Helpers.Http.get(this.url).then(function(response) {
            var parsed = JSON.parse(response);
            return [[parsed["data"]["image_url"]]];
        });
    }
});