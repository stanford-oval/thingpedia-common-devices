// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of io.home-assistant
//
// Copyright 2019 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const HomeAssistantDevice = require('./base');

module.exports = class HomeAssistantLightbulbDevice extends HomeAssistantDevice {
    async do_set_power({ power }) {
        if (power === 'on')
            await this._callService('light', 'turn_on');
        else
            await this._callService('light', 'turn_off');
    }

    async do_alert_long() {
        await this._callService('light', 'turn_on', { flash: 'long' });
    }

    async do_color_loop() {
        await this._callService('light', 'turn_on', { effect: 'colorloop' });
    }
};
