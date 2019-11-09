// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of io.home-assistant
//
// Copyright 2019 Swee Kiat Lim <sweekiat@cs.stanford.edu>
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
    async do_set_power({ power }) {
        if (power === 'on')
            await this._callService('fan', 'turn_on');
        else
            await this._callService('fan', 'turn_off');
    }
    async do_set_oscillate({ oscillate }) {
        if (oscillate === 'on')
            await this._callService('fan', 'oscillate', {oscillating: true});
        else
            await this._callService('fan', 'oscillate', {oscillating: false});
    }
};
