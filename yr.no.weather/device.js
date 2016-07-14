// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

// Weather forecast for the current location
//
// FIXME: refactor me!
module.exports = new Tp.DeviceClass({
    Name: 'WeatherDevice',

    _init: function(engine, state) {
        this.parent(engine, state);

        this.uniqueId = 'no.yr.weather';

        this.name = "Yr.no Weather";
        this.description = "Yr.no Weather shows the current weather conditions and weather forecast where your phone is";
    },

    checkAvailable: function() {
        return Tp.Availability.AVAILABLE;
    }
});
