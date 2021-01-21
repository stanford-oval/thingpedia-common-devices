// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of io.home-assistant
//
// Copyright 2021
//
// See LICENSE for details
"use strict";

const HomeAssistantDevice = require('./base');

module.exports = class HomeAssistantDoor extends HomeAssistantDevice {
    async get_state() {
        if (this.domain === 'sensor') {
            return [{ value:  parseFloat(this.state.state)}];
        } else if ( this.domain === 'binary_sensor') {
            return [{ state: this.state.state }];
        } else {
            throw new Error (`Unexpected Home Assistant domain ${this.domain}`);
        }
        
    }
    // note: subscribe_ must NOT be async, or an ImplementationError will occur at runtime
    subscribe_state() {
        if (this.domain === 'sensor') {
            return this._subscribeState(() => {
                    return { value: parseFloat(this.state.state)};
            });
        } else if ( this.domain === 'binary_sensor') {
            return this._subscribeState(() => {
                return {state : this.state.state};
            });
        } else {
            throw new Error (`Unexpected Home Assistant domain ${this.domain}`);
        }
    }
};

