// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of io.home-assistant
//
// Copyright 2019 Swee Kiat Lim <sweekiat@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const HomeAssistantDevice = require('./base');

module.exports = class HomeAssistantWindow extends HomeAssistantDevice {
	constructor(engine, state, master, entityId) {
		const [domain,] = entityId.split('.');
		this.domain = domain;
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
    async do_open_cover() {
    	if (this.domain === 'cover') {
    		await this._callService("cover", "open_cover");
    	} else {
    		throw new Error("I regret to inform you that your window does not have an automated opening function. You have to open it yourself.");
    	}
    }
    async do_close_cover() {
    	if (this.domain === 'cover') {
    		await this._callService("cover", "close_cover");
    	} else {
    		throw new Error("I regret to inform you that your window does not have an automated closing function. You have to close it yourself.");
    	}
    }
};
