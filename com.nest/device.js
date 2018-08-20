// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016-2018 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Firebase = require('firebase');
const Tp = require('thingpedia');

const Collections = require('./collections');
const NestDeviceCollection = Collections.NestDeviceCollection;
const UnionObjectSet = Collections.UnionObjectSet;

const ThermostatDevice = require('./thermostat');
const CameraDevice = require('./camera');

const SmokeAlarmDevice = class NestSmokeAlarmDevice extends Tp.BaseDevice {
    constructor(engine, state, url) {
        super(engine, state);

        this.url = url;
        this.uniqueId = 'com.nest-' + state.device_id;
        this.isTransient = true;
    }

    get kind() {
        return 'com.nest';
    }

    get name() {
        return 'Nest Smoke Alarm ' + this.state.name;
    }

    get description() {
        return 'This is your ' + this.state.name_long;
    }

    checkAvailable() {
        return this.state.is_online ? Tp.Availability.AVAILABLE :
            Tp.Availability.UNAVAILABLE;
    }
};
SmokeAlarmDevice.metadata = {
    types: ['smoke-alarm']
};

class NestDevice extends Tp.BaseDevice {
    static get runOAuth2() {
        return Tp.Helpers.OAuth2({
            kind: 'com.nest',
            scope: null,
            set_state: true,
            authorize: 'https://home.nest.com/login/oauth2',
            get_access_token: 'https://api.home.nest.com/oauth2/access_token',
            redirect_uri: 'https://thingengine.stanford.edu/devices/oauth2/callback/com.nest',

            callback(engine, accessToken, refreshToken) {
                return engine.devices.loadOneDevice({ kind: 'com.nest',
                                                      accessToken: accessToken,
                                                      refreshToken: refreshToken }, true);
            }
        });
    }

    constructor(engine, state) {
        super(engine, state);

        // unfortunately, the user can only have one nest account configured
        this.uniqueId = 'com.nest';

        this.name = "Nest Account";
        this.description = "This is your Nest, and can manage your thermostats, security cameras and power meters. "
            + "If you have configured any device with Nest, it will appear in the \"Configured Devices\" section of "
            + "your dashboard.";

        this._firebaseClient = null;
        this._firebaseClientCount = 0;

        const thermostats = new NestDeviceCollection(this, "devices/thermostats", ThermostatDevice);
        const smokeAlarms = new NestDeviceCollection(this, "devices/smoke_co_alarms", SmokeAlarmDevice);
        const cameras = new NestDeviceCollection(this, "devices/cameras", CameraDevice);
        this._deviceCollection = new UnionObjectSet([thermostats, smokeAlarms, cameras]);
    }

    start() {
        this._deviceCollection.start();
    }

    stop() {
        this._deviceCollection.stop();
    }

    refFirebaseClient() {
        if (this._firebaseClient === null) {
            this._firebaseClient = new Firebase('wss://developer-api.nest.com/');
            this._firebaseClient.authWithCustomToken(this.accessToken);
        }

        this._firebaseClientCount ++;
        return this._firebaseClient;
    }

    unrefFirebaseClient() {
        this._firebaseClientCount--;
        if (this._firebaseClientCount === 0) {
            this._firebaseClient.goOffline();
            this._firebaseClient = null;
        }
    }

    // it's cloud backed so always available
    checkAvailable() {
        return Tp.Availability.AVAILABLE;
    }

    queryInterface(iface) {
        switch (iface) {
        case 'subdevices':
            return this._deviceCollection;
        default:
            return null;
        }
    }
}
NestDevice.subdevices = {
    'com.nest.security_camera': CameraDevice,
    'com.nest.thermostat': ThermostatDevice,
    'com.nest.smoke_alarm': SmokeAlarmDevice
};

module.exports = NestDevice;