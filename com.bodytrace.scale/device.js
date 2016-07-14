// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

module.exports = new Tp.DeviceClass({
    Name: 'BodyTraceScaleDevice',
    Kinds: ['scale'],

    _init: function(engine, state) {
        this.parent(engine, state);

        this.serial = state.serial;
        this.username = state.username;
        this.password = state.password;

        // NOTE: for legacy reasons, this is bodytrace-scale-*, not com.bodytrace.scale-* as one would
        // hope
        // please do not follow this example
        this.uniqueId = 'bodytrace-scale-' + this.serial;

        this.name = "BodyTrace Scale %s".format(this.serial);
        this.description = "This is a BodyTrace Scale owned by %s"
            .format(this.username);
    },

    // it's cloud backed so always available
    checkAvailable: function() {
        return Tp.Availability.AVAILABLE;
    },
});

