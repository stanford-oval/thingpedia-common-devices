// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of io.home-assistant
//
// Copyright 2019 Swee Kiat Lim <sweekiat@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const HomeAssistantDevice = require('./base');

module.exports = class HomeAssistantCover extends HomeAssistantDevice {
	constructor(engine, state, master, entityId) {
		super(engine, state, master, entityId);
		// let supportedDeviceClasses = {
		// 	awning: {},
		// 	blind: {},
		// 	curtain: {},
		// 	damper: {},
		// 	shade: {},
		// 	shutter: {},
		// 	window: {}
		// };
		// let allSupportedFeatures = {
		// 	SUPPORT_OPEN: 1,
		// 	SUPPORT_CLOSE: 2,
		// 	SUPPORT_SET_POSITION: 4,
		// 	SUPPORT_STOP: 8,
		// 	SUPPORT_OPEN_TILT : 16,
		// 	SUPPORT_CLOSE_TILT: 32,
		// 	SUPPORT_STOP_TILT: 64,
		// 	SUPPORT_SET_TILT_POSITION: 128
		// }
		// this.deviceClass = this.state.attributes.device_class;
		// this.supportedFeatures = this._callService("cover", "supported_features");
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
    	await this._callService("cover", "open_cover");
    }
    async do_close_cover() {
    	await this._callService("cover", "close_cover");
    }
};
