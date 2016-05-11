// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const Tp = require('thingpedia');

const Collections = require('./collections');
const NestDeviceCollection = Collections.NestDeviceCollection;
const UnionObjectSet = Collections.UnionObjectSet;

const ThermostatDevice = new Tp.DeviceClass({
    Name: 'NestThermostatDevice',

    _init: function(engine, state, url) {
        this.parent(engine, state);

        this.url = url;
        this.uniqueId = 'com.nest-' + state.device_id;
        this.isTransient = true;
    },

    get name() {
        return 'Nest Thermostat ' + this.state.name;
    },

    get description() {
        return 'This is your ' + this.state.name_long;
    },

    checkAvailable: function() {
        return this.state.is_online ? Tp.Availability.AVAILABLE :
            Tp.Availability.UNAVAILABLE;
    }
});

const SmokeAlarmDevice = new Tp.DeviceClass({
    Name: 'NestSmokeAlarmDevice',

    _init: function(engine, state, url) {
        this.parent(engine, state);

        this.url = url;
        this.uniqueId = 'com.nest-' + state.device_id;
        this.isTransient = true;
    },

    get name() {
        return 'Nest Smoke Alarm ' + this.state.name;
    },

    get description() {
        return 'This is your ' + this.state.name_long;
    },

    checkAvailable: function() {
        return this.state.is_online ? Tp.Availability.AVAILABLE :
            Tp.Availability.UNAVAILABLE;
    }
});

const CameraDevice = new Tp.DeviceClass({
    Name: 'NestCameraDevice',

    _init: function(engine, state, url) {
        this.parent(engine, state);

        this.url = url;
        this.uniqueId = 'com.nest-' + state.device_id;
        this.isTransient = true;
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
    }
});

module.exports = new Tp.DeviceClass({
    Name: 'NestDevice',
    UseOAuth2: Tp.Helpers.OAuth2({
        kind: 'com.nest',
        client_id: '730cd4c5-04f4-481e-8574-0ccc80827d99',
        client_secret: 'bAFYaXHpZF0sXP2qhsuvZ3jQj',
        scope: null,
        set_state: true,
        authorize: 'https://home.nest.com/login/oauth2',
        get_access_token: 'https://api.home.nest.com/oauth2/access_token',
        callback: function(engine, accessToken, refreshToken) {
            var auth = 'Bearer ' + accessToken;
            return engine.devices.loadOneDevice({ kind: 'com.nest',
                                                  accessToken: accessToken,
                                                  refreshToken: refreshToken });
        }
    }),

    _init: function(engine, state) {
        this.parent(engine, state);

        // unfortunately, the user can only have one nest account configured
        this.uniqueId = 'com.nest';

        this.name = "Nest Account";
        this.description = "This is your Nest, and can manage your thermostats, security cameras and power meters. "
            + "If you have configured any device with Nest, it will appear in the \"Configured Devices\" section of "
            + "your dashboard.";

        this._firebaseClient = null;
        this._firebaseClientCount = 0;

        var thermostats = new NestDeviceCollection(this, "devices/thermostats", ThermostatDevice);
        var smokeAlarms = new NestDeviceCollection(this, "devices/smoke_co_alarms", SmokeAlarmDevice);
        var cameras = new NestDeviceCollection(this, "devices/cameras", CameraDevice);
        this._deviceCollection = new UnionObjectSet([thermostats, smokeAlarms, cameras]);
    },

    start: function() {
        this._deviceCollection.start();
    },

    stop: function() {
        this._deviceCollection.stop();
    },

    get accessToken() {
        return this.state.accessToken;
    },

    get refreshToken() {
        return this.state.refreshToken;
    },

    refFirebaseClient: function() {
        if (this._firebaseClient === null) {
            this._firebaseClient = new Firebase('wss://developer-api.nest.com/');
            this._firebaseClient.auth(this.accessToken);
        }

        this._firebaseClientCount ++;
        return this._firebaseClient;
    },

    unrefFirebaseClient: function() {
        this._firebaseClientCount--;
        if (this._firebaseClientCount === 0) {
            this._firebaseClient.goOffline();
            this._firebaseClient = null;
        }
    },

    // it's cloud backed so always available
    checkAvailable: function() {
        return Tp.Availability.AVAILABLE;
    },

    queryInterface: function(iface) {
        switch (iface) {
        case 'subdevices':
            return this._deviceCollection;
        case 'oauth2':
            return this;
        default:
            return null;
        }
    },

    refreshCredentials: function() {
        // FINISHME refresh the access token using the refresh token
    }
});

