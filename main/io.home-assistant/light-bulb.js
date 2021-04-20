// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of io.home-assistant
//
// Copyright 2019 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const HomeAssistantSwitch = require('./switch.js');

module.exports = class HomeAssistantLightbulb extends HomeAssistantSwitch {
    
    async get_power() {
        return [{ power: this.state.state }];
    }
    // note: subscribe_ must NOT be async, or an ImplementationError will occur at runtime
    subscribe_power() {
        return this._subscribeState(() => {
            return { power: this.state.state };
        });
    }

    async do_set_power({ power }) {
        if (power === 'on')
            await this._callService('light', 'turn_on');
        else
            await this._callService('light', 'turn_off');
    }

    async do_set_color({ color }) {
        await this._callService('light', 'turn_on', { color_name: color });
    }

    async do_set_brightness({ pct }) {
        await this._callService('light', 'turn_on', { brightness_pct: pct });
    }

    async do_raise_brightness() {
        await this._callService('light', 'turn_on', { brightness_step_pct: (+10) });
    }

    async do_lower_brightness() {
        await this._callService('light', 'turn_on', { brightness_step_pct: (-10) });
    }

    async do_alert_long() {
        await this._callService('light', 'turn_on', { flash: 'long' });
    }

    async do_color_loop() {
        await this._callService('light', 'turn_on', { effect: 'colorloop' });
    }
};
