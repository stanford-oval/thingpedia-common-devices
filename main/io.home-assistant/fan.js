// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of io.home-assistant
//
// Copyright 2019 Swee Kiat Lim <sweekiat@stanford.edu>
//
// See LICENSE for details
"use strict";

const HomeAssistantDevice = require('./base');

module.exports = class HomeAssistantFan extends HomeAssistantDevice {
    async get_state() {
            return [{ state: this.state.state }];
        }
        // note: subscribe_ must NOT be async, or an ImplementationError will occur at runtime
    subscribe_state() {
        return this._subscribeState(() => {
            return { state: this.state.state };
        });
    }
    async get_oscillation() {
            if (this.state.attributes.oscillating === undefined) {
                throw new Error("Oh no! I couldn't retrieve the oscillation state of your fan");
            } else {
                if (this.state.attributes.oscillating)
                    return [{ state: 'oscillating' }];
                else
                    return [{ state: 'not_oscillating' }];
            }
        }
        // note: subscribe_ must NOT be async, or an ImplementationError will occur at runtime
    subscribe_oscillation() {
        return this._subscribeState(() => {
            if (this.state.attributes.oscillating === undefined) {
                throw new Error("Oh no! I couldn't retrieve the oscillation state of your fan");
            } else {
                if (this.state.attributes.oscillating)
                    return { state: 'oscillating' };
                else
                    return { state: 'not_oscillating' };
            }
        });
    }
    async do_set_power({ power }) {
        if (power === 'on')
            await this._callService('fan', 'turn_on');
        else
            await this._callService('fan', 'turn_off');
    }

    async do_set_oscillation({ oscillation }) {
        if (oscillation === 'on')
            await this._callService('fan', { 'oscillating': true });
        else
            await this._callService('fan', { 'oscillating': false });
    }
};