// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

// A... "something", that lives off some web service
// using some unknown protocol
module.exports = new Tp.DeviceClass({
    Name: 'TestDevice',
    UseOAuth2: function(engine) {
        // replace with real auth -- see docs
        engine.devices.loadOneDevice({ kind: 'org.thingpedia.test',
                                       userId: '12345678',
                                       userName: 'john_doe' }, true);
        return null;
    },

    _init: function(engine, state) {
        this.parent(engine, state);

        this.uniqueId = 'org.thingpedia.test-' + state.userId;

        this.globalName = 'test';
        this.name = "ThingEngine™ Test Device";
        this.description = "This is a ThingEngine Test Device belonging to "
            .format(this.state.userName);
    },
});
