// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2015-2018 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

module.exports = class BluetoothA2dpSinkDevice extends Tp.BaseDevice {
    static loadFromDiscovery(engine, publicData, privateData) {
        return new BluetoothA2dpSinkDevice(engine,
                                           { kind: 'org.thingpedia.bluetooth.speaker.a2dp',
                                             discoveredBy: engine.ownTier,
                                             paired: privateData.paired,
                                             uuids: publicData.uuids,
                                             class: publicData.class,
                                             hwAddress: privateData.address,
                                             alias: privateData.alias }, true);
    }

    constructor(engine, state) {
        super(engine, state);

        this.alias = state.alias;
        this.hwAddress = state.hwAddress;

        this.uniqueId = 'org.thingpedia.bluetooth.speaker.a2dp.generic-' + state.hwAddress.replace(/:/g,'-');
        this.descriptors = ['bluetooth/' + state.hwAddress];

        this.name = "A2DP Bluetooth Speaker %s".format(this.alias);
        this.description = "This is a Bluetooth speaker capabable of playing high-fidelity music";
    }

    completeDiscovery(delegate) {
        if (this.state.paired) {
            this.engine.devices.addDevice(this);
            delegate.configDone();
            return Promise.resolve();
        }

        if (!this.engine.platform.hasCapability('bluetooth')) {
            delegate.configFailed(new Error("Platform has no bluetooth capability"));
            return Promise.resolve();
        }

        var btApi = this.engine.platform.getCapability('bluetooth');
        return btApi.pairDevice(this.hwAddress).then(() => {
            this.state.paired = true;
            this.engine.devices.addDevice(this);
            delegate.configDone();
        }).catch((e) => {
            delegate.configFailed(e);
        });
    }

    checkAvailable() {
        if (!this.engine.platform.hasCapability('bluetooth'))
            return Tp.Availability.UNAVAILABLE;

        var btApi = this.engine.platform.getCapability('bluetooth');
        return btApi.readUUIDs(this.hwAddress).then((uuids) => {
            if (uuids !== null)
                return Tp.Availability.AVAILABLE;
            else
                return Tp.Availability.UNAVAILABLE;
        });
    }

    async _doSetVolume(relative, value) {
        const audioRouter = this.engine.platform.getCapability('audio-router');
        const audioManager = this.engine.platform.getCapability('audio-manager');
        const isBluetooth = await audioRouter.isAudioRouteBluetooth(this.hwAddress);
        if (!isBluetooth) {
            console.log(this.device.uniqueId + ' is not the current audio sink, ignoring volume change request');
            return;
        }

        if (relative)
            await audioManager.adjustMediaVolume(value, false);
        else
            await audioManager.setMediaVolume(value, false);
    }

    do_raise_volume() {
        return this._doSetVolume(true, +1);
    }
    do_lower_volume() {
        return this._doSetVolume(true, -1);
    }
    do_set_volume({ percent }) {
        return this._doSetVolume(false, percent);
    }
    do_mute() {
        return this._doSetVolume(false, 0);
    }
    do_unmute() {
        return this._doSetVolume(false, 50);
    }
    async do_play_music() {
        const audioRouter = this.engine.platform.getCapability('audio-router');
        const systemApps = this.engine.platform.getCapability('system-apps');
        await audioRouter.setAudioRouteBluetooth(this.hwAddress);
        return systemApps.startMusic();
    }
    async do_set_sink() {
        const audioRouter = this.engine.platform.getCapability('audio-router');
        return audioRouter.setAudioRouteBluetooth(this.hwAddress);
    }
    async get_power() {
        throw new Error(`Sorry! Querying the state of the speaker is not supported.`);
    }
    subscribe_power() {
        throw new Error(`Sorry! Querying the state of the speaker is not supported.`);
    }
    async do_set_power({ power }) {
        throw new Error(`Sorry! Remotely turning the speaker on or off is not supported.`);
    }
    
};
