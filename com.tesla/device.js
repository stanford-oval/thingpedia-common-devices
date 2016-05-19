// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const Tp = require('thingpedia');
const ObjectSet = Tp.ObjectSet;

const TESLA_CLIENT_ID = 'e4a9949fcfa04068f59abb5a658f2bac0a3428e4652315490b659d5ab3f35a9e';
const TESLA_CLIENT_SECRET = 'c75f14bbadc8bee3a7594412c31416f8300256d7668ea7e6e7f06727bfb9d220';
const TESLA_BASE_URI = 'https://owner-api.teslamotors.com';
//const TESLA_BASE_URI = 'https://private-anon-6e9b9d475-timdorr.apiary-mock.com';

function makeAction(id) {
    return new Tp.ChannelClass({
        Name: 'TeslaCarAction' + id,

        _init: function(engine, device) {
            this.parent();
            this.engine = engine;
            this.device = device;
        },

        sendEvent: function() {
            Tp.Helpers.Http.post(this.device.baseUrl + '/command/' + id, '',
                                 { auth: 'Bearer ' + this.device.master.accessToken })
                .then(function() {
                    console.log('Honked horn successfully');
                })
                .catch(function(e) {
                    console.error('Failed to honk horn: ' + e.message);
                });
        }
    });
}

const TeslaCarDevice = new Tp.DeviceClass({
    Name: 'TeslaCarDevice',

    _init: function(engine, state, master) {
        this.parent(engine, state);

        this.master = master;
        this.uniqueId = 'com.tesla-' + state.username + '-' + state.device_id;
        this.isTransient = true;

        this.baseUrl = TESLA_BASE_URI + '/api/1/vehicles/' + state.device_id;
    },

    get vin() {
        return this.state.vin;
    },

    get kind() {
        return 'com.tesla';
    },

    get name() {
        return 'Tesla Car ' + (this.state.display_name || this.state.vin);
    },

    get description() {
        return 'This is your Tesla Car';
    },

    checkAvailable: function() {
        return this.state.state === 'online' ? Tp.Availability.AVAILABLE :
            Tp.Availability.UNAVAILABLE;
    },

    getActionClass: function(action) {
        switch (action) {
        case 'honk_horn':
            return makeAction('honk_horn');
        default:
            throw new Error('Invalid channel ' + action);
        }
    }
});
TeslaCarDevice.metadata = {
    types: ['car']
};

module.exports = new Tp.DeviceClass({
    Name: 'TeslaDevice',

    _init: function(engine, state) {
        this.parent(engine, state);

        this.uniqueId = 'com.tesla-' + state.username;

        this.name = "Tesla Account of " + state.username;
        this.description = "This is your Tesla account, and groups all your cars. "
            + "Each car will appear in the \"Configured Devices\" section of "
            + "your dashboard.";

        this._deviceCollection = new ObjectSet.Simple();
        this._deviceCollection.setMaxListeners(Infinity);
    },

    start: function() {
        return Tp.Helpers.Http.post(TESLA_BASE_URI + '/oauth/token',
                                    'grant_type=password&client_id=' + TESLA_CLIENT_ID
                                    + '&client_secret=' + TESLA_CLIENT_SECRET
                                    + '&email=' + encodeURIComponent(this.state.username)
                                    + '&password=' + encodeURIComponent(this.state.password))
            .then((response) => {
                this.accessToken = JSON.parse(response).access_token;
                return Tp.Helpers.Http.get(TESLA_BASE_URI + '/api/1/vehicles',
                                           { auth: 'Bearer ' + this.accessToken });
            })
            .then((response) => {
                var parsed = JSON.parse(response);

                for (var vehicle of parsed.response) {
                    this._deviceCollection.addOne(new TeslaCarDevice(this.engine, {
                        username: this.state.username,
                        display_name: vehicle.display_name,
                        device_id: vehicle.vehicle_id,
                        vin: vehicle.vin,
                        state: vehicle.state,
                    }, this));
                }
            });
    },

    stop: function() {
        this._deviceCollection.removeAll();
    },

    // it's cloud backed so always available
    checkAvailable: function() {
        return Tp.Availability.AVAILABLE;
    },

    queryInterface: function(iface) {
        switch (iface) {
        case 'subdevices':
            return this._deviceCollection;
        default:
            return null;
        }
    }
});

