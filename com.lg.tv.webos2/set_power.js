// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const Tp = require('thingpedia');

module.exports = new Tp.ChannelClass({
    Name: 'SetPowerAction',

    _doOpen() {
        return this.device.refWebsocket();
    },

    _doClose() {
        return this.device.unrefWebsocket();
    },

    sendEvent(event) {
        var power = event[0];

        if (event === true) // the tv is already on if we get here
            return Q();
        else
            return this.device.queryInterface('lg-websocket').sendRequest('ssap://system/turnOff');
    }
});
