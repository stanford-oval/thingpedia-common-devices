// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const Tp = require('thingpedia');

const Query = require('./query');
const Source = require('./source');
const Sink = require('./sink');

const CameraWebUrlQuery = Query('CameraWebUrl', function(firebase, event) {
    return [[firebase.web_url]];
});

const CameraDevice = new Tp.DeviceClass({
    Name: 'NestCameraDevice',

    _init: function(engine, state, url, master) {
        this.parent(engine, state);

        this.master = master;
        this.url = url;
        this.uniqueId = 'com.nest-' + state.device_id;
        this.isTransient = true;
    },

    get kind() {
        return 'com.nest';
    },

    get name() {
        return 'Nest Camera ' + this.state.name;
    },

    get description() {
        return 'This is your ' + this.state.name_long;
    },

    checkAvailable: function() {
        return this.state.is_online ? Tp.Availability.AVAILABLE :
            Tp.Availability.UNAVAILABLE;
    },

    getTriggerClass: function(id) {
        switch(id) {
        default:
            throw new Error('Invalid channel ' + id);
        }
    },

    getActionClass: function(id) {
        switch(id) {
        default:
            throw new Error('Invalid channel ' + id);
        }
    },

    getQueryClass: function(id) {
        switch(id) {
        case 'get_url':
            return CameraWebUrlQuery;
        default:
            throw new Error('Invalid channel ' + id);
        }
    }
});
CameraDevice.metadata = {
    types: ['security-camera']
};

module.exports = CameraDevice;
