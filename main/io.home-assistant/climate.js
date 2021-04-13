// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of io.home-assistant
//
// Copyright 2019 Swee Kiat Lim <sweekiat@stanford.edu>
//
// See LICENSE for details
"use strict";

const HomeAssistantDevice = require('./base');

module.exports = class HomeAssistantClimate extends HomeAssistantDevice {
    constructor(engine, state, master, entityId) {
        super(engine, state, master, entityId);
        const [domain,] = entityId.split('.');
        this.domain = domain;
        this.device_class = this.state.attributes.device_class;
        if (['binary_sensor', 'sensor'].includes(this.domain)) {
            let supportedDeviceClasses = {
                humidity: {
                    on: 'humid',
                    off: 'normal'
                }
            };
            this.deviceStateMapping = supportedDeviceClasses[this.device_class] || {on: 'on', off: 'off'};
        }
    }
    _get_state() {
        if (this.domain === 'sensor') {
            let value = parseFloat(this.state.state);
            return [{state: undefined, value: value}];
        } else if (this.domain === 'binary_sensor') {
            let state = this.deviceStateMapping[this.state.state];
            return [{state: state, value: undefined}];
        } else {
            throw new Error (`Unexpected Home Assistant domain ${this.domain}`);
        }
    }
    async get_humidity() {
        if (['binary_sensor', 'sensor'].includes(this.domain) && this.device_class === 'humidity') {
            return this._get_state();
        }
        else if (this.domain === 'climate') {
            let value = parseFloat(this.state.current_humidity);
            return [{state: undefined, value: value}];
        }
        else {
            throw new Error ('Sorry! Your device doesn\'t support checking humidity.');
        }
    }
    // note: subscribe_ must NOT be async, or an ImplementationError will occur at runtime
    subscribe_humidity() {
        if (['binary_sensor', 'sensor'].includes(this.domain) && this.device_class === 'humidity') {
            if (this.domain === 'sensor') {
                let value = parseFloat(this.state.state);
                return this._subscribeState(() => {
                    return {state: undefined, value: value};
                });
            } else if (this.domain === 'binary_sensor') {
                let state = this.deviceStateMapping[this.state.state];
                return this._subscribeState(() => {
                    return {state: state, value: undefined};
                });
            } else {
                throw new Error (`Unexpected Home Assistant domain ${this.domain}`);
            }
        } else if (this.domain === 'climate') {
            let value = parseFloat(this.state.current_humidity);
            return this._subscribeState(() => {
                return {state: undefined, value: value};
            });
        }
        else {
            throw new Error ('Sorry! Your device doesn\'t support checking humidity.');
        }
    }
    async get_temperature() {
        if (['binary_sensor', 'sensor'].includes(this.domain) && this.device_class === 'temperature') {
            return this._get_state();
        }
        else if (this.domain === 'climate') {
            let value = parseFloat(this.state.current_temperature);
            return [{state: undefined, value: value}];
        }
        else {
            throw new Error ('Sorry! Your device doesn\'t support checking temperature.');
        }
    }
    // note: subscribe_ must NOT be async, or an ImplementationError will occur at runtime
    subscribe_temperature() {
        if (['binary_sensor', 'sensor'].includes(this.domain) && this.device_class === 'temperature') {
            if (this.domain === 'sensor') {
                return this._subscribeState(() => {
                    return {state: undefined, value: parseFloat(this.state.state)};
                });
            } else {
                throw new Error (`Unexpected Home Assistant domain ${this.domain}`);
            }
        } else if (this.domain === 'climate') {
            return this._subscribeState(() => {
                return {state: undefined, value: parseFloat(this.state.current_temperature)};
            });
        }
        else {
            throw new Error ('Sorry! Your device doesn\'t support checking temperature.');
        }
    }
    
    async get_hvac_state() {
        if (this.domain === 'climate') {
            let mode = this.state.hvac_mode;
            let state = this.state.hvac_action;
            return [{mode: mode, state: state}];
        }
        else {
            throw new Error ('Sorry! Your device doesn\'t support querying HVAC state.');
        }
    }

    // note: subscribe_ must NOT be async, or an ImplementationError will occur at runtime
    subscribe_hvac_state() {
        if (this.domain === 'climate') {
            return this._subscribeState(() => {
                return {mode: this.state.hvac_mode, state: this.state.hvac_action};
            });
        }
        else {
            throw new Error ('Sorry! Your device doesn\'t support querying HVAC state.');
        }
    }

    async do_set_hvac_mode({ mode }) {
        if (this.domain === 'climate')
            await this._callService('climate', 'set_hvac_mode', {hvac_mode: mode});
        else
            throw new Error ('Sorry! Your device doesn\'t support setting HVAC mode.');
    }

    async do_set_minmax_temperature({ low, high }) {
        if (this.domain === 'climate')
            await this._callService('climate', 'set_temperature', {target_temp_high: high, target_temp_low: low});
        else
            throw new Error ('Sorry! Your device doesn\'t support setting min or max temperature.');
    }

    async do_set_target_temperature({ value }) {
        if (this.domain === 'climate')
            await this._callService('climate', 'set_temperature', {temperature: value});
        else
            throw new Error ('Sorry! Your device doesn\'t support setting a target temperature.');
    }
};
