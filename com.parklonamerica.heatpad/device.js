// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const Tp = require('thingpedia');

module.exports = new Tp.DeviceClass({
    Name: 'ParklonHeatPadDevice',
    Kinds: ['heatpad'],

    _init: function(engine, state) {
        this.parent(engine, state);

        this.account = state.account;
        this.password = state.password;

        this.uniqueId = 'com.parklonamerica.heatpad-iris-' + this.account;

        this.name = "Parklon Iris Warm Water Mat";
        this.description = "The device allows you to turn on/off your Parklon heatpad.";
    },

    checkAvailable: function() {
        return Tp.Availability.AVAILABLE;
    },
});
