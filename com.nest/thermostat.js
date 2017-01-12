// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

const Query = require('./query');
const Source = require('./source');
const Sink = require('./sink');

const TemperatureChannel = Source('Temperature', function(blob) {
    this.emitEvent([new Date, blob.ambient_temperature_c]);
}, function(event, hint, formatter) {
    var date = event[0];
    var temperature = event[1];
    return ["Ambient temperature: %.1f C".format(temperature)];
});

const GetTemperatureChannel = Query('GetTemperature', function(firebase, event) {
    return [[firebase.ambient_temperature_c]];
}, function(event, filters, hint, formatter) {
    var temperature = event[0];
    return ["Ambient temperature: %.1f C".format(temperature)];
});

const HumidityChannel = Source('Humidity', function(blob) {
    this.emitEvent([new Date, blob.humidity]);
}, function(event, filters) {
    var date = event[0];
    var humidity = event[1];
    return ["Humidity: %f%%".format(Math.round(humidity))];
});

const GetHumidityChannel = Query('GetHumidity', function(firebase, event) {
    return [[firebase.humidity]];
}, function(event, filters, hint, formatter) {
    var humidity = event[0];
    return ["Humidity: %f%%".format(Math.round(humidity))];
});

const SetHvacMode = Sink('SetHvacMode', function(firebase, event) {
    return firebase.update({ hvac_state: event[0].replace('_', '-') });
});

const GetHvacStateChannel = Query('GetHvacStateChannel', function(firebase, event) {
    return [[firebase.hvac_mode, firebase.hvac_state]];
}, function(event, filters, hint, formatter) {
    var mode = event[0];
    var state = event[1];
    switch (state) {
    case 'heating':
        return ["HVAC is heating"];
    case 'cooling':
        return ["HVAC is cooling"];
    default:
        return ["HVAC is off"];
    }
});

function clampTemperature(temp) {
    return Math.round(temp*2)/2;
}

const SetTargetTemperatureChannel = Sink('SetTargetTemperature', function(firebase, event) {
    return firebase.update({ target_temperature_c: clampTemperature(event[0]) });
});

const SetTemperatureBoundsChannel = Sink('SetTemperatureBounds', function(firebase, event) {
    return firebase.update({ target_temperature_high_c: clampTemperature(event[0]),
                             target_temperature_low_c: clampTemperature(event[1]) });
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

    getQueryClass: function(id) {
        switch(id) {
        case 'get_temperature':
            return GetTemperatureChannel;
        case 'get_humidity':
            return GetHumidityChannel;
        case 'get_hvac_state':
            return GetHvacStateChannel;
        default:
            throw new Error('Invalid channel ' + id);
        }
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
        case 'set_hvac_mode':
            return SetHvacModeChannel;
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
