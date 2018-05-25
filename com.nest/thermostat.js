// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016-2018 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const stream = require('stream');
const Tp = require('thingpedia');

function clampTemperature(temp) {
    return Math.round(temp*2)/2;
}

class FirebaseStream extends stream.Readable {
    constructor(master, url, callback) {
        super();
        this._master = master;
        this._url = url;

        this._firebase = this._master.refFirebaseClient().child(url);
        this._listener = (snapshot) => this.push(callback(snapshot.val()));
        this._firebase.on('value', this._listener);
    }

    _read() {
    }

    destroy() {
        this._firebase.off('value', this._listener);
        this._master.unrefFirebaseClient();
    }
}

const ThermostatDevice = class NestThermostatDevice extends Tp.BaseDevice {
    constructor(engine, state, url, master) {
        super(engine, state);

        this.master = master;
        this.url = url;
        this.uniqueId = 'com.nest-' + state.device_id;
        this.isTransient = true;
    }

    get kind() {
        return 'com.nest.thermostat';
    }

    get name() {
        return 'Nest Thermostat ' + this.state.name;
    }

    get description() {
        return 'This is your ' + this.state.name_long;
    }

    checkAvailable() {
        return this.state.is_online ? Tp.Availability.AVAILABLE :
            Tp.Availability.UNAVAILABLE;
    }

    subscribe_get_humidity() {
        return new FirebaseStream(this.master, this.url, (state) => {
            return { value: state.humidity };
        });
    }

    get_get_humidity() {
        return [{ value: this.state.humidity }];
    }

    subscribe_get_hvac_state() {
        return new FirebaseStream(this.master, this.url, (state) => {
            return { mode: state.hvac_mode, state: state.hvac_state };
        });
    }

    get_get_hvac_state() {
        return [{ mode: this.state.hvac_mode, state: this.state.hvac_state }];
    }

    subscribe_get_temperature() {
        return new FirebaseStream(this.master, this.url, (state) => {
            return { value: state.ambient_temperature_c };
        });
    }

    get_get_temperature() {
        return [{ value: this.state.ambient_temperature_c }];
    }

    do_set_target_temperature({ value }) {
        let firebase = this.master.refFirebaseClient().child(this.device.url);
        firebase.update({ target_temperature_c: clampTemperature(value) });
        this.master.unrefFirebaseClient();
    }

    do_set_minmax_temperature({ low, high }) {
        let firebase = this.master.refFirebaseClient().child(this.device.url);
        firebase.update({ target_temperature_high_c: clampTemperature(high),
                          target_temperature_low_c: clampTemperature(low) });
        this.master.unrefFirebaseClient();
    }

    do_set_hvac_mode({ mode }) {
        let firebase = this.master.refFirebaseClient().child(this.device.url);
        firebase.update({ hvac_state: mode.replace('_', '-') });
        this.master.unrefFirebaseClient();
    }
};
ThermostatDevice.metadata = {
    types: ['thermostat']
};

module.exports = ThermostatDevice;
