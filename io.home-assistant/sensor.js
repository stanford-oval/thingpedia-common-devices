// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of io.home-assistant
//
// Copyright 2019 Xiaomeng Jin <tracyjxm@stanford.edu>
//
// See LICENSE for details
"use strict";

const HomeAssistantDevice = require('./base');

module.exports = class HomeAssistantSensor extends HomeAssistantDevice {
	constructor(engine, state, master, entityId) {
        super(engine, state, master, entityId);
        const [domain,] = entityId.split('.');
		this.domain = domain;
        this.device_class = this.state.attributes.device_class;
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
                gas: {
                    on: 'detecting',
                    off: 'not_detecting'
                },
                heat: {
                    on: 'hot',
                    off: 'normal'
                },
                motion: {
                    on: 'detecting',
                    off: 'not_detecting'
                },
                occupancy: {
                    on: 'occupied',
                    off: 'unoccupied'
                },
                plug: {
                    on: 'plugged',
                    off: 'unplugged'
                },
                smoke: {
                    on: 'detecting',
                    off: 'not_detecting'
                },
                sound: {
                    on: 'detecting',
                    off: 'not_detecting'
                }
            };
            this.deviceStateMapping = supportedDeviceClasses[this.device_class] || {on: 'on', off: 'off'};
        }
    }
    async get_state() {
        if (this.domain === 'sensor') {
            let value = parseFloat(this.state.state);
            return [{state: undefined, value: value}];
        } else if (this.domain === 'binary_sensor') {
            let state = this.deviceStateMapping[this.state.state];
            if (['gas', 'smoke'].includes(this.device_class))
                state = state === 'detecting' ? this.device_class : 'nothing';
            return [{state: state, value: undefined}];
        } else {
            throw new Error (`Unexpected Home Assistant domain ${this.domain}`);
        }
    }
    // note: subscribe_ must NOT be async, or an ImplementationError will occur at runtime
    subscribe_state() {
        if (this.domain === 'sensor') {
            let value = parseFloat(this.state.state);
            return this._subscribeState(() => {
                return {state: undefined, value: value};
            });
        } else if (this.domain === 'binary_sensor') {
            let state = this.deviceStateMapping[this.state.state];
            if (['gas', 'smoke'].includes(this.device_class))
                state = state === 'detecting' ? this.device_class : 'nothing';
            return this._subscribeState(() => {
                return {state: state, value: undefined};
            });
        } else {
            throw new Error (`Unexpected Home Assistant domain ${this.domain}`);
        }
    }
};