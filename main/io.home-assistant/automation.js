// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of io.home-assistant
//
// Copyright 2019 Swee Kiat Lim <sweekiat@stanford.edu>
//
// See LICENSE for details
"use strict";

const HomeAssistantSwitch = require('./switch.js');

module.exports = class HomeAssistantAutomation extends HomeAssistantSwitch {
    async get_state() {
        return [{ state: this.state.state,
            mode : this.state.attributes.mode ? this.state.attributes.mode.toLowerCase() : undefined,
            current: this.state.attributes.current ? this.state.attributes.current.toLowerCase() : undefined,
            last_trigged: this.state.attributes.last_triggered ? this.state.attributes.last_triggered.toLowerCase() : undefined }];
    }
    // note: subscribe_ must NOT be async, or an ImplementationError will occur at runtime
    subscribe_state() {
        return this._subscribeState(() => {
            return [{ state: this.state.state,
                mode : this.state.attributes.mode ? this.state.attributes.mode.toLowerCase() : undefined,
                current: this.state.attributes.current ? this.state.attributes.current.toLowerCase() : undefined,
                last_trigged: this.state.attributes.last_triggered ? this.state.attributes.last_triggered.toLowerCase() : undefined }];
        });
    }
    async do_set_power({ power }) {
        if (power === 'on')
            await this._callService('automation', 'turn_on');
        else
            await this._callService('automation', 'turn_off');
    }
    async do_trigger() {
        await this._callService("automation", "trigger");
    }
    async do_toggle() {
        await this._callService("automation", "toggle");
    }
};
