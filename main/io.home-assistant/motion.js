// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of io.home-assistant
//
// Copyright 2021
//
// See LICENSE for details
"use strict";

const HomeAssistantDevice = require('./base');

module.exports = class HomeAssistantMotion extends HomeAssistantDevice {
    constructor(engine, state, master, entityId) {
        super(engine, state, master, entityId);
        const [domain,] = entityId.split('.');
		this.domain = domain;
        this.device_class = this.state.attributes.device_class;
    }
    async get_motion() {
        if (this.domain === 'binary_sensor') {
            return [{ state: this.state.state }];
        } else {
            throw new Error (`Unexpected Home Assistant domain ${this.domain}`);
        }  
    }
    // note: subscribe_ must NOT be async, or an ImplementationError will occur at runtime
    subscribe_motion() {
        if (this.domain === 'binary_sensor') {
            return this._subscribeState(() => {
                return {state : this.state.state};
            });
        } else {
            throw new Error (`Unexpected Home Assistant domain ${this.domain}`);
        }
    }
};
