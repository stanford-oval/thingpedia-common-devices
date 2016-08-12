// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Rakesh Ramesh <rakeshr1@stanford.edu>
//
// See COPYING for details

const Tp = require('thingpedia');
const hue = require('node-hue-api');
const HueApi = hue.HueApi;
const LightState = hue.lightState;

const SetPowerAction = new Tp.ChannelClass({
    Name: 'PhilipsHueSetPowerAction',

    _init: function(engine, device, params) {
        this.parent();
        this.engine = engine;
        this.device = device;

        this._hue = this.device.master.queryInterface('hue');
    },

    sendEvent: function(event) {
        var power = event[0];

        var lightState = LightState.create();
        return this._hue.setLightState(this.device.id, power ? lightState.on() : lightState.off());
    }
})

const ColorLoopAction = new Tp.ChannelClass({
    Name: 'PhilipsHueColorLoopAction',

    _init: function(engine, device, params) {
        this.parent();
        this.engine = engine;
        this.device = device;
        this._hue = this.device.master.queryInterface('hue');
    },

    sendEvent: function(event) {
        var lightState = LightState.create();
        return this._hue.setLightState(this.device.id, lightState.colorLoop());
    }
})

const AlertLongAction = new Tp.ChannelClass({
    Name: 'PhilipsHueAlertLongAction',

    _init: function(engine, device, params) {
        this.parent();
        this.engine = engine;
        this.device = device;
        this._hue = this.device.master.queryInterface('hue');
    },

    sendEvent: function(event) {
        var lightState = LightState.create();
        return this._hue.setLightState(this.device.id, lightState.alertLong());
    }
})

const HueLightBulbDevice = new Tp.DeviceClass({
    Name: 'PhilipsHueDevice',

    _init: function(engine, master, state) {
        this.parent(engine, state);

        this.master = master;
        this.uniqueId = master.uniqueId + '-' + state.id;
        this.id = state.id;
        this.name = state.name;
        this.description = "Your Hue " + state.type;
    },

    get kind() {
        return 'com.hue';
    },

    getActionClass: function(id) {
        switch(id) {
        case 'set_power':
            return SetPowerAction;
        case 'color_loop':
            return ColorLoopAction;
        case 'alert_long':
            return AlertLongAction;
        default:
            throw new Error('Invalid action ' + id);
        }
    }
});
HueLightBulbDevice.metadata = {
    types: ['light-bulb']
};

const PhilipsHueDevice = new Tp.DeviceClass({
    Name: 'PhilipsHueDevice',
    UseDiscovery(engine, publicData, privateData) {
        return new PhilipsHueDevice(engine,
                                    { kind: 'com.hue',
                                      discoveredBy: engine.ownTier,
                                      uuid: privateData.uuid,
                                      host: privateData.host,
                                      port: privateData.port
                                     });
    },

    _init: function(engine, state) {
        this.parent(engine, state);

        this.uniqueId = 'com.hue-' + state.uuid;
        this.name = "Philips Hue Bridge (%s)".format(state.host);
        this.description = "This is a Philips Hue Bridge. It holds your light bulbs toghether.";

        this._initialized = false;
        this._deviceCollection = new Tp.ObjectSet.Simple(false);
    },

    get uuid() {
        return this.state.uuid;
    },

    get host() {
        return this.state.host;
    },

    get userToken() {
        return this.state.userToken;
    },

    _ensureHue() {
        if (!this._hue)
            this._hue = new HueApi(this.host, this.userToken);
    },

    completeDiscovery(delegate) {
        if (this.userToken) {
            delegate.configDone();
            return;
        }

        var hue = new HueApi(this.host);
        return hue.registerUser(this.host, "Sabrina HUE User").then((token) => {
            this.state.userToken = token;
            this.engine.devices.addDevice(this);
            this._initialize().done();
            delegate.configDone();
        }).catch((e) => {
            delegate.configFailed(e);
        });
    },

    start() {
        return this._initialize();
    },

    _initialize() {
        if (this._initialized)
            return;
        if (!this.userToken)
            return;
        this._initialized = true;

        this._ensureHue();
        return this._hue.lights().then((result) => {
            return this._deviceCollection.addMany(result.lights.map((l) => {
                return new HueLightBulbDevice(this.engine, this, l);
            }));
        });
    },

    stop() {
    },

    queryInterface: function(iface) {
        switch (iface) {
        case 'subdevices':
            return this._deviceCollection;
        case 'hue':
            this._ensureHue();
            return this._hue;
        default:
            return null;
        }
    },
});
module.exports = PhilipsHueDevice;
