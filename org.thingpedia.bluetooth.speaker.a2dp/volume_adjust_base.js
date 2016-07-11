// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
//

const Tp = require('thingpedia');

module.exports = function(name, relative, value) {
    return new Tp.ChannelClass({
        Name: 'BluetoothA2dp' + name + 'Channel',
        RequiredCapabilities: ['bluetooth', 'audio-router', 'audio-manager'],

        _init(engine, device) {
            this.parent();
            this.device = device;

            this._audioManager = engine.platform.getCapability('audio-manager');
            this._audioRouter = engine.platform.getCapability('audio-router');
        },

        _doOpen() {
            return this._audioRouter.start();
        },

        _doClose() {
            return this._audioRouter.stop();
        },

        sendEvent(event) {
            this._audioRouter.isAudioRouteBluetooth(this.device.hwAddress)
                .then((isBluetooth) => {
                    if (!isBluetooth) {
                        console.log(this.device.uniqueId + ' is not the current audio sink, ignoring volume change request');
                        return;
                    }

                    if (relative)
                        return this._audioManager.adjustMediaVolume(value, false);
                    else
                        return this._audioManager.setMediaVolume(event[0], false);
                }).catch((e) => {
                    console.log('Failed to change volume on ' + this.device.uniqueId + ': ' + e.message);
                }).done();
        }
    });
}
