// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of io.home-assistant
//
// Copyright 2019 Xiaomeng Jin <tracyjxm@stanford.edu>
//
// See LICENSE for details
"use strict";

const HomeAssistantDevice = require('./base');

module.exports = class HomeAssistantSensorTemperature extends HomeAssistantDevice {
	async get_temperature() {
        if (this.domain === 'sensor')
            return [{value: parseFloat(this.state.state)}];
        else
            throw new Error (`Unexpected Home Assistant domain ${this.domain}`);
    }
    // note: subscribe_ must NOT be async, or an ImplementationError will occur at runtime
    subscribe_temperature() {
        if (this.domain === 'sensor') {
            return this._subscribeState(() => {
                return {value: parseFloat(this.state.state)};
            });
        } else {
            throw new Error (`Unexpected Home Assistant domain ${this.domain}`);
        }
    }
};