// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of io.home-assistant
//
// Copyright 2019 Xiaomeng Jin <tracyjxm@stanford.edu>
//
// See LICENSE for details
"use strict";

const HomeAssistantDevice = require('./base');

module.exports = class HomeAssistantSensorHumidity extends HomeAssistantDevice {
	constructor(engine, state, master, entityId) {
        super(engine, state, master, entityId);
        const [domain,] = entityId.split('.');
		this.domain = domain;
        this.device_class = this.state.attributes.device_class;
        if (this.domain === 'binary_sensor')
            this.deviceStateMapping = {on: 'humid', off: 'normal'};
    }
    async get_humidity() {
        if (this.domain === 'sensor')
            return [{state: undefined, value: parseFloat(this.state.state)}];
        else if (this.domain === 'binary_sensor')
            return [{state: this.deviceStateMapping[this.state.state], value: undefined}];
        else
            throw new Error (`Unexpected Home Assistant domain ${this.domain}`);
    }
    // note: subscribe_ must NOT be async, or an ImplementationError will occur at runtime
    subscribe_humidity() {
        if (this.domain === 'sensor') {
            return this._subscribeState(() => {
                return {state: undefined, value: parseFloat(this.state.state)};
            });
        } else if (this.domain === 'binary_sensor') {
            return this._subscribeState(() => {
                return {state: this.deviceStateMapping[this.state.state], value: undefined};
            });
        } else {
            throw new Error (`Unexpected Home Assistant domain ${this.domain}`);
        }
    }
};