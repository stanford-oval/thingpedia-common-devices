// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of io.home-assistant
//
// Copyright 2019 Swee Kiat Lim <sweekiat@stanford.edu>
//
// See LICENSE for details
"use strict";

const HomeAssistantSensor = require('./sensor');

module.exports = class HomeAssistantLock extends HomeAssistantSensor {
    async get_state() {
        if (this.domain === 'lock')
            throw new Error('Sorry! Your lock doesn\'t seem to support querying.');
        else
            return super.get_state();
    }
    // note: subscribe_ must NOT be async, or an ImplementationError will occur at runtime
    subscribe_state() {
        if (this.domain === 'lock')
            throw new Error('Sorry! Your lock doesn\'t seem to support querying.');
        else
            return super.subscribe_state();
    }
    async do_set_state({ state, code }) {
        if (this.domain === 'lock') {
            if (state === 'lock') {
               if (code === undefined) 
                    await this._callService('lock', 'lock');
                else
                    await this._callService('lock', 'lock', {code: code});
            } else {
                if (code === undefined)
                    await this._callService('lock', 'unlock');
                else
                    await this._callService('lock', 'unlock', {code: code});
            }
        } else {
            throw new Error('Sorry! Your lock doesn\'t seem to support remote locking or unlocking.');
        }
    }
};
