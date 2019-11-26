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
                motion: {
                    on: 'detecting',
                    off: 'not_detecting'
                }
            };
            this.deviceStateMapping = supportedDeviceClasses[this.device_class] || {on: 'on', off: 'off'};
        }
    }
    async get_state() {
        if (this.domain === 'binary_sensor') {
            let state = this.deviceStateMapping[this.state.state];
            return [{state: state, value: undefined}];
        } else {
            throw new Error (`Unexpected Home Assistant domain ${this.domain}`);
        }
    }
    // note: subscribe_ must NOT be async, or an ImplementationError will occur at runtime
    subscribe_state() {
        if (this.domain === 'binary_sensor') {
            let state = this.deviceStateMapping[this.state.state];
            return this._subscribeState(() => {
                return {state: state, value: undefined};
            });
        } else {
            throw new Error (`Unexpected Home Assistant domain ${this.domain}`);
        }
    }
    get_current_event() {
        throw new Error ('Sorry! Your device doesn\'t support querying the current event.');
    }
    do_set_power() {
        throw new Error ('Sorry! Your device doesn\'t support turning on and off.');
    }
};