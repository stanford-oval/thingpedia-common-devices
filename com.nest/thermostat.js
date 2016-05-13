// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const Tp = require('thingpedia');

const Source = require('./source');
const Sink = require('./sink');

const TemperatureChannel = Source('Temperature', function(blob) {
    this.emitEvent([new Date, blob.ambient_temperature_c]);
});

const HumidityChannel = Source('Humidity', function(blob) {
    this.emitEvent([new Date, blob.humidity]);
});

const SetHvacStateChannel = Sink('SetHvacState', function(firebase, event) {
    firebase.update({ hvac_state: event[0] });
});

const SetTargetTemperatureChannel = Sink('SetTargetTemperature', function(firebase, event) {
    firebase.update({ target_temperature_c: event[0] });
});

const SetTemperatureBoundsChannel = Sink('SetTemperatureBounds', function(firebase, event) {
    firebase.update({ target_temperature_high_c: event[0],
                      target_temperature_low_c: event[1] });
});

const ThermostatDevice = new Tp.DeviceClass({
    Name: 'NestThermostatDevice',

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
        return 'Nest Thermostat ' + this.state.name;
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
        case 'temperature':
            return TemperatureChannel;
        case 'humidity':
            return HumidityChannel;
        default:
            throw new Error('Invalid channel ' + id);
        }
    },

    getActionClass: function(id) {
        switch(id) {
        case 'set_hvac_state':
            return SetHvacStateChannel;
        case 'set_target_temperature':
            return SetTargetTemperatureChannel;
        case 'set_minmax_temperature':
            return SetTemperatureBoundsChannel;
        default:
            throw new Error('Invalid channel ' + id);
        }
    }
});
ThermostatDevice.metadata = {
    types: ['thermostat']
};

module.exports = ThermostatDevice;
