// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of io.home-assistant
//
// Copyright 2019 Swee Kiat Lim <sweekiat@stanford.edu>
//
// See LICENSE for details
"use strict";

const HomeAssistantDevice = require('./base');

module.exports = class HomeAssistantSwitch extends HomeAssistantDevice {
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
            await this._callService('switch', 'turn_on');
        else
            await this._callService('switch', 'turn_off');
    }
};
