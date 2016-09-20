// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Juan Vimberg <jvimberg@stanford.edu>
//                Tucker L. Ward <tlward@stanford.edu>
//                Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');
const Url = require('url');
var common = require('./common.js');

var BASE_URL = 'https://api.uber.com/v1/';
var ACTION_GET_TIME_EST = "estimates/time";

module.exports = new Tp.ChannelClass({
    Name: "UberTimeEstimateChannel",

    formatEvent(event, filters, hint) {
        var start = event[0];
        var name = event[1];
        var time = event[2];

        if (hint === 'string-title')
            return "Estimate for %s".format(name);
        else if (hint === 'string-body')
            return "%.0f min"
                .format(time / 60000);
        else
            return "Estimate for %s: %.0f min"
                .format(name, time / 60000);
    },

    invokeQuery(filters) {
        var start = filters[0];

        var url = Url.parse(BASE_URL + ACTION_GET_TIME_EST);
        url.search = undefined;
        url.query = {
            start_latitude: start.y,
            start_longitude: start.x,
        };

        return common.get(Url.format(url)).then(function(response) {
            return response.times.map(function(time) {
                return [filters[0],
                    time.display_name,
                    time.estimate * 1000]; // convert to milliseconds
            });
        });
    }

    // other methods of channel class
});
