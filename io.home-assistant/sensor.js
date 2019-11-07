// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of io.home-assistant
//
// Copyright 2019 Xiaomeng Jin <tracyjxm@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const HomeAssistantDevice = require('./base');

module.exports = class HomeAssistantSensor extends HomeAssistantDevice {
	constructor(engine, state, master, entityId) {
		super(engine, state, master, entityId);
    }
    async get_state() {
    	return [{ state: this.state.state }];
    }
    // note: subscribe_ must NOT be async, or an ImplementationError will occur at runtime
    subscribe_state() {
        return this._subscribeState(() => {
            return { state: this.state.state };
        });
    }
};