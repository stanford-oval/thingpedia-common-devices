// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of io.home-assistant
//
// Copyright 2019 Swee Kiat Lim <sweekiat@stanford.edu>
//
// See LICENSE for details
"use strict";

const HomeAssistantSensor = require('./sensor');

module.exports = class HomeAssistantCover extends HomeAssistantSensor {
    async get_state() {
        if (this.domain === 'cover')
            return [{ state: this.state.state }];
        return super.get_state();
    }
    // note: subscribe_ must NOT be async, or an ImplementationError will occur at runtime
    subscribe_state() {
        if (this.domain === 'cover') {
            return this._subscribeState(() => {
                return { state: this.state.state };
            });
        }
        return super.subscribe_state();
    }

    async do_set_openclosestop({ state }) {
        if (this.domain === 'cover') {
            if (state === 'open')
                await this._callService("cover", "open_cover");
            else if (state === 'close')
                await this._callService("cover", "close_cover");
            else
                await this._callService("cover", "stop_cover");
        } else {
            // For Binary Sensor - Window
            throw new Error(`I regret to inform you that your device does not have an automated ${state} function. You have to open it yourself.`);
        }
    }

    async do_set_coverposition({ state }) {
        if (this.domain === 'cover') {
            await this._callService('cover', 'set_position', { position: state });
        } else {
            // For Binary Sensor - Window
            throw new Error(`I regret to inform you that your device does not have an automated function to set the cover position to ${state}. You have to do it manually.`);
        }
    }

    async do_set_tiltopenclosestop({ state }) {
        if (this.domain === 'cover') {
            if (state === 'open')
                await this._callService("cover", "open_cover_tilt");
            else if (state === 'close')
                await this._callService("cover", "close_cover_tilt");
            else
                await this._callService("cover", "stop_cover_tilt");
        } else {
            // For Binary Sensor - Window
            throw new Error(`I regret to inform you that your device does not have an automated ${state} function. You have to open it yourself.`);
        }
    }

    async do_set_tiltposition({ state }) {
        if (this.domain === 'cover') {
            await this._callService('cover', 'tilt_position', { position: state });
        } else {
            // For Binary Sensor - Window
            throw new Error(`I regret to inform you that your device does not have an automated function to set the tilt position to ${state}. You have to do it manually.`);
        }
    }
};
