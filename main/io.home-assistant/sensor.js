// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of io.home-assistant
//
// Copyright 2019 Xiaomeng Jin <tracyjxm@stanford.edu>
//
// See LICENSE for details
"use strict";

const Units = require('thingtalk-units');

const HomeAssistantDevice = require('./base');

function adjustUnit(value, fromUnit) {
    switch (fromUnit) {

    // first the units were we use the same name
    case 'K':
    case 'ms':
    case 's':
    case 'min':
    case 'h':
    // XXX month and meter both use the same unit!
    case 'm':
    case 'mm':
    case 'cm':
    case 'km':
    case 'in':
    case 'ft':
    case 'mi':
    case 'gal':
    case 'g':
    case 'mg':
    case 'kg':
    case 'oz':
    case 'lb':
    case 'lx':
    case 'mph':
    case 'dB':
    case 'dBm':
    case 'KiB':
    case 'MiB':
    case 'GiB':
    case 'TiB':
        return Units.transformToBaseUnit(value, fromUnit);

    // units that we support with a different name
    case '°F':
        return Units.transformToBaseUnit(value, 'F');
    case 'd':
        return Units.transformToBaseUnit(value, 'day');
    case 'L':
    case 'mL':
        return Units.transformToBaseUnit(value, fromUnit.toLowerCase());
    case 'm³':
        return Units.transformToBaseUnit(value, 'm3');
    case 'ft³':
        return Units.transformToBaseUnit(value, 'ft3');
    case 'fl. oz.':
        return Units.transformToBaseUnit(value, 'floz');
    case 'm²':
        return Units.transformToBaseUnit(value, 'm2');
    case 'm/s':
        return Units.transformToBaseUnit(value, 'mps');
    case 'km/h':
        return Units.transformToBaseUnit(value, 'kmph');
    case 'B':
        return Units.transformToBaseUnit(value, 'byte');
    case 'kB':
        return Units.transformToBaseUnit(value, 'KB');

    // TODO move to thingtalk-units
    case 'μs':
        return value/1000;//base unit is ms
    case 'µg':
        return value/(1000 * 1000 * 1000); //base unit is kg
    case 'yd':
        return value*0.9144;//base unit is m
    case 'mm/d':
        return value/1000 / 86400;//base unit is mps
    case 'in/d':
        return Units.transformToBaseUnit(value/86400, 'in');//base unit is mps
    case 'in/h':
        return Units.transformToBaseUnit(value/3600, 'in');//base unit is mps
    case 'bit':
        return value/8;//base unit is byte
    case 'kbit':
        return value/8*1000;
    case 'Mbit':
        return value/8*1000000;
    case 'Gbit':
        return value/8*1000000000;
    case 'PB':
        return value*1e15;
    case 'EB':
        return value*1e18;
    case 'ZB':
        return value*1e21;
    case 'YB':
        return value*1e24;
    case 'PiB':
        return value*(1024**5);
    case 'EiB':
        return value*(1024**6);
    case 'ZiB':
        return value*(1024**7);
    case 'YiB':
        return value*(1024**8);

    case 'Hz':
    case 'GHz':
    case 'm³/h':
    case 'ft³/m':
    case 'µS/cm':
    case 'W/m²':
    case 'mm/h':
    case 'µg/m³':
    case 'mg/m³':
    case 'p/m³':
    case 'ppm':
    case 'ppb':
    case 'bit/s':
    case 'kbit/s':
    case 'Mbit/s':
    case 'Gbit/s':
    case 'B/s':
    case 'kB/s':
    case 'MB/s':
    case 'GB/s':
    case 'KiB/s':
    case 'MiB/s':
    case 'GiB/s':
        // TODO add these units

    default:
        return value;
    }
}

module.exports = class HomeAssistantSensor extends HomeAssistantDevice {
    constructor(engine, state, master, entityId) {
        super(engine, state, master, entityId);
        const [domain, ] = entityId.split('.');
        this.domain = domain;
        this.device_class = this.state.attributes.device_class;
        if (['binary_sensor', 'cover'].includes(this.domain)) {
            let supportedDeviceClasses = {
                battery: {
                    on: 'low',
                    off: 'normal'
                },
                battery_charging: {
                    on: 'charging',
                    off: 'not_charging'
                },
                particulate_matter_2_5: {
                    on: 'detected',
                    off: 'not_detected'
                },
                particulate_matter_10: {
                    on: 'detected',
                    off: 'not_detected'
                },
                particulate_matter_0_1: {
                    on: 'detected',
                    off: 'not_detected'
                },
                ozone: {
                    on: 'detected',
                    off: 'not_detected'
                },
                carbon_monoxide: {
                    on: 'detected',
                    off: 'not_detected'
                },
                co: {
                    on: 'detected',
                    off: 'not_detected'
                },
                carbon_dioxide: {
                    on: 'detected',
                    off: 'not_detected'
                },
                sulphur_dioxide: {
                    on: 'detected',
                    off: 'not_detected'
                },
                nitrogen_oxide: {
                    on: 'detected',
                    off: 'not_detected'
                },
                nitrogen_monoxide: {
                    on: 'detected',
                    off: 'not_detected'
                },
                nitrogen_dioxide: {
                    on: 'detected',
                    off: 'not_detected'
                },
                volatile_organic_compounds: {
                    on: 'detected',
                    off: 'not_detected'
                },
                connectivity: {
                    on: 'connected',
                    off: 'disconnected'
                },
                door: {
                    on: 'open',
                    off: 'closed'
                },
                flood: {
                    on: 'flooding',
                    off: 'not_flooding'
                },
                garage: {
                    on: 'open',
                    off: 'closed'
                },
                garage_door: {
                    on: 'open',
                    off: 'closed'
                },
                gas: {
                    on: 'detected',
                    off: 'not_detected'
                },
                light: {
                    on: 'detected',
                    off: 'not_detected'
                },
                lock: {
                    on: 'locked',
                    off: 'unlocked'
                },
                cold: {
                    on: 'cold',
                    off: 'normal'
                },
                heat: {
                    on: 'hot',
                    off: 'normal'
                },
                humidity: {
                    on: 'humid',
                    off: 'normal',
                },
                moisture: {
                    on: 'wet',
                    off: 'dry'
                },
                motion: {
                    on: 'detected',
                    off: 'not_detected'
                },
                moving: {
                    on: 'moving',
                    off: 'not_moving'
                },
                occupancy: {
                    on: 'detecting',
                    off: 'not_detecting'
                },
                opening: {
                    on: 'open',
                    off: 'closed'
                },
                plug: {
                    on: 'plugged',
                    off: 'unplugged'
                },
                power: {
                    on: 'detected',
                    off: 'not_detected'
                },
                presence: {
                    on: 'home',
                    off: 'away'
                },
                problem: {
                    on: 'detected',
                    off: 'not_detected'
                },
                running: {
                    on: 'running',
                    off: 'not_running'
                },
                safety: {
                    on: 'safe',
                    off: 'unsafe'
                },
                smoke: {
                    on: 'detected',
                    off: 'nothing'
                },
                sound: {
                    on: 'sound',
                    off: 'not_sound'
                },
                tamper: {
                    on: 'tampering',
                    off: 'not_tampering'
                },
                vibration: {
                    on: 'detected',
                    off: 'not_detected'
                },
                window: {
                    on: 'open',
                    off: 'closed'
                }
            };
            this.deviceStateMapping = supportedDeviceClasses[this.device_class] || { on: 'on', off: 'off' };
        }
    }
    async get_state() {
        if (this.domain === 'sensor') {
            let value = adjustUnit(parseFloat(this.state.state), this.state.attributes.unit_of_measurement);
            return [{ state: undefined, value: value }];
        } else if (this.domain === 'binary_sensor') {
            let state = this.deviceStateMapping[this.state.state];
            if (['gas', 'CO', 'CO2', 'smoke'].includes(this.device_class))
                state = state === 'detecting' ? this.device_class : 'nothing';
            return [{ state: state, value: undefined }];
        } else {
            throw new Error(`Unexpected Home Assistant domain ${this.domain}`);
        }
    }
        // note: subscribe_ must NOT be async, or an ImplementationError will occur at runtime
    subscribe_state() {
        if (this.domain === 'sensor') {
            return this._subscribeState(() => {
                return { state: undefined, value: parseFloat(this.state.state) };
            });
        } else if (this.domain === 'binary_sensor') {
            return this._subscribeState(() => {
                let state = this.deviceStateMapping[this.state.state];
                if (['gas', 'CO', 'CO2', 'smoke'].includes(this.device_class))
                    state = state === 'detecting' ? this.device_class : 'nothing';
                return { state: state, value: undefined };
            });
        } else {
            throw new Error(`Unexpected Home Assistant domain ${this.domain}`);
        }
    }
        // Specific query methods for sensors that use a different Thingpedia function name
        // than the generic state
        // (in other gateways/APIs, a single device can implement multiple of these interfaces,
        // so we give them different names so they don't conflict)
    async get_motion() {
        return this.get_state();
    }
    subscribe_motion() {
        return this.subscribe_state();
    }
    async get_occupancy() {
        return this.get_state();
    }
    subscribe_occupancy() {
        return this.subscribe_state();
    }
    async get_sound() {
        return this.get_state();
    }
    subscribe_sound() {
        return this.subscribe_state();
    }
    async get_illuminance() {
        return this.get_state();
    }
    subscribe_illuminance() {
        return this.subscribe_state();
    }
    async get_uv() {
        return this.get_state();
    }
    subscribe_uv() {
        return this.subscribe_state();
    }
    async get_flood() {
        return this.get_state();
    }
    subscribe_flood() {
        return this.subscribe_state();
    }
    async get_temperature() {
        return this.get_state();
    }
    subscribe_temperature() {
        return this.subscribe_state();
    }
    async get_humidity() {
        return this.get_state();
    }
    subscribe_humidity() {
        return this.subscribe_state();
    }
};
