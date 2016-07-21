// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//                Andrei Bajenov <abajenov@stanford.edu>
//                Darshan Kapashi <darshank@stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

module.exports = new Tp.DeviceClass({
    Name: 'WeatherAPIDevice',

    _init: function(engine, state) {
        this.parent(engine, state);

        this.name = "Weather";
        this.description = "Weather forecasts and information provided by met.no";
        this.uniqueId = 'org.thingpedia.weather';
    },

    checkAvailable: function() {
        return Tp.Availability.AVAILABLE;
    }
});
