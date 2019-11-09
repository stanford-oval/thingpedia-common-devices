// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of io.home-assistant
//
// Copyright 2019 Swee Kiat Lim <sweekiat@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const HomeAssistantDevice = require('./base');

module.exports = class HomeAssistantVacuum extends HomeAssistantDevice {
	async get_state() {
    	return [{ state: this.state.state }];
    }
    // note: subscribe_ must NOT be async, or an ImplementationError will occur at runtime
    subscribe_state() {
        return this._subscribeState(() => {
            return { state: this.state.state };
        });
    }
    async do_turn_on() {
    	await this._callService("vacuum", "turn_on");
    }
    async do_turn_off() {
    	await this._callService("vacuum", "turn_off");
    }
    async do_return_to_base() {
    	await this._callService("vacuum", "return_to_base");
    }
    async do_stop() {
    	await this._callService("vacuum", "stop");
    }
    async do_start() {
        await this._callService("vacuum", "start");
    }
    async do_pause() {
        await this._callService("vacuum", "pause");
    }
};
