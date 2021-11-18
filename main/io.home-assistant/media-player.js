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
    async get_power() {
        return [{ state: this.state.state }];
    }
    
    // note: subscribe_ must NOT be async, or an ImplementationError will occur at runtime
    subscribe_power() {
        return this._subscribeState(() => {
            return { state: this.state.state };
        });
    }

    async do_set_power({ power }) {
        if (power === 'on')
            await this._callService('media_player', 'turn_on');
        else
            await this._callService('media_player', 'turn_off');
    }

    async do_raise_volume() {
        await this._callService("media_player", "volume_up");
    }

    async do_lower_volume() {
        await this._callService("media_player", "volume_down");
    }

    async do_mute() {
        await this._callService("media_player", "volume_mute", { is_volume_muted: true });
    }

    async do_unmute() {
        await this._callService("media_player", "volume_mute", { is_volume_muted: false });
    }

    async do_set_volume({ volume }) {
        volume = Math.max(0, Math.min(1, volume / 100.));
        await this._callService("media_player", "volume_set", { volume_level: volume });
    }

    async do_player_play() {
        await this._callService("media_player", "media_play");
    }

    async do_player_pause() {
        await this._callService("media_player", "media_pause");
    }

    async do_media_stop() {
        await this._callService("media_player", "media_stop");
    }

    async do_player_next() {
        await this._callService("media_player", "media_next_track");
    }

    async do_player_previous() {
        await this._callService("media_player", "media_previous_track");
    }

    async do_player_shuffle({ shuffle }) {
        if (shuffle === "on") {
            await this._callService("media_player", "shuffle_set", {
                shuffle: true
            });
        } else {
            await this._callService("media_player", "shuffle_set", {
                shuffle: false
            });
        }
    }

    async do_player_repeat({ repeat }) {
        if (repeat === "off") {
            await this._callService("media_player", "repeat_set", {
                repeat: "off"
            });
        } else if (repeat === "track") {
            await this._callService("media_player", "repeat_set", {
                repeat: "one"
            });
        } else {
            await this._callService("media_player", "repeat_set", {
                repeat: "all"
            });
        }
    }

/*
    async do_play_url({ url }) {
        // TODO for tv
        throw new Error(`Sorry! Playing from URL is not supported yet.`);
    }

    async do_play_media({ url }) {
        // TODO for tv
        throw new Error(`Sorry! Playing from URL is not supported yet.`);
    }

    async do_set_sink() {
        // TODO for speaker
        throw new Error(`Sorry! Setting your speaker as a default device is not supported yet.`);
    }

    async do_play_music() {
        // TODO for speaker
        throw new Error(`Sorry! Playing music is not supported yet.`);
    }*/
};
