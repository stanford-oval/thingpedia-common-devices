// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of io.home-assistant
//
// Copyright 2019 Xiaomeng Jin <tracyjxm@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const HomeAssistantDevice = require('./base');

module.exports = class HomeAssistantSensor extends HomeAssistantDevice {
	constructor(engine, state, master, entityId) {
        super(engine, state, master, entityId);
        const [domain,] = entityId.split('.');
		this.domain = domain;
        if (['binary_sensor', 'cover'].includes(this.domain)) {
            let supportedDeviceClasses = {
                battery: {
                    on: 'low',
                    off: 'normal'
                },
                cold: {
                    on: 'cold',
                    off: 'normal'
                },
                connectivity: {
                    on: 'connected',
                    off: 'disconnected'
                },
                door: {
                    on: 'open',
                    off: 'closed'
                },
                garage_door: {
                    on: 'open',
                    off: 'closed'
                },
                gas: {
                    on: 'detecting_gas',
                    off: 'not_detecting_gas'
                },
                heat: {
                    on: 'hot',
                    off: 'normal'
                },
                light: {
                    on: 'detecting_light',
                    off: 'not_detecting_light'
                },
                lock: {
                    on: 'unlocked',
                    off: 'locked'
                },
                moisture: {
                    on: 'wet',
                    off: 'dry'
                },
                motion: {
                    on: 'detecting_motion',
                    off: 'not_detecting_motion'
                },
                moving: {
                    on: 'moving',
                    off: 'not_moving'
                },
                occupancy: {
                    on: 'occupied',
                    off: 'not_occupied'
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
                    on: 'detecting_power',
                    off: 'not_detecting_power'
                },
                presence: {
                    on: 'home',
                    off: 'away'
                },
                problem: {
                    on: 'detecting_a_problem',
                    off: 'not_detecting_a_problem'
                },
                safety: {
                    on: 'unsafe',
                    off: 'safe'
                },
                smoke: {
                    on: 'detecting_smoke',
                    off: 'not_detecting_smoke'
                },
                sound: {
                    on: 'detecting_sound',
                    off: 'not_detecting_sound'
                },
                vibration: {
                    on: 'detecting_vibration',
                    off: 'not_detecting_vibration'
                }
            };
            this.deviceStateMapping = supportedDeviceClasses[this.state.attributes.device_class] || {on: 'on', off: 'off'};
        }
    }
    async get_state() {
        if (this.domain === 'sensor') {
            var value = this.state.state + this.state.attributes.unit_of_measurement;
            return [{state: undefined, value: value}];
        } else if (this.domain === 'binary_sensor') {
            var state = this.deviceStateMapping[this.state.state].split('_').join(' ');
            return [{state: state, value: undefined}];
        }
    }
    // note: subscribe_ must NOT be async, or an ImplementationError will occur at runtime
    subscribe_state() {
        if (this.domain === 'sensor') {
            var value = this.state.state + this.state.attributes.unit_of_measurement;
            return this._subscribeState(() => {
                return [{state: undefined, value: value}];
            });
        } else if (this.domain === 'binary_sensor') {
            var state = this.deviceStateMapping[this.state.state].split('_').join(' ');
            return this._subscribeState(() => {
                return [{state: state, value: undefined}];
            });
        }
    }
};