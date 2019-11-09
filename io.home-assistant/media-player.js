// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of io.home-assistant
//
// Copyright 2019 Swee Kiat Lim <sweekiat@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const HomeAssistantDevice = require('./base');

module.exports = class HomeAssistantMediaPlayer extends HomeAssistantDevice {
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
    	await this._callService("media_player", "turn_on");
    }
    async do_turn_off() {
    	await this._callService("media_player", "turn_off");
    }
    async do_volume_up() {
    	await this._callService("media_player", "volume_up");
    }
    async do_volume_down() {
    	await this._callService("media_player", "volume_down");
    }
    async do_volume_mute() {
        await this._callService("media_player", "volume_mute", {is_volume_muted: true});
    }
    async do_volume_unmute() {
        await this._callService("media_player", "volume_mute", {is_volume_muted: false});
    }
};
