// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingPedia
//
// Copyright 2016 Quinlan Rachel Jung <quinlanj@stanford.edu>
//                Tushar Paul <aritpaul@stanford.edu>,
//
// See COPYING for details

const Tp = require('thingpedia');

module.exports = new Tp.DeviceClass({
    Name: 'TwilioDevice',

    _init: function(engine, state) {
        this.parent(engine, state);

        this.uniqueId = 'com.twilio';

        this.name = "Twilio";
        this.description = "Send an SMS, MMS or make a phone call to a number of your choice with the integrated Twilio service.";
    }
});
