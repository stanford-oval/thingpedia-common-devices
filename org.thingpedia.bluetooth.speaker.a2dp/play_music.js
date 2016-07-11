// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
//

const Tp = require('thingpedia');

module.exports = new Tp.ChannelClass({
    Name: 'BluetoothA2dpSinkPlayMusicChannel',
    RequiredCapabilities: ['bluetooth', 'audio-router', 'system-apps'],

    _init: function(engine, device) {
        this.parent();

        this.device = device;
        this._audioRouter = engine.platform.getCapability('audio-router');
        this._systemApps = engine.platform.getCapability('system-apps');
    },

    _doOpen() {
        return this._audioRouter.start();
    },

    _doClose() {
        return this._audioRouter.stop();
    },

    sendEvent(event) {
        this._audioRouter.setAudioRouteBluetooth(this.device.hwAddress)
            .then(() => {
                return this._systemApps.startMusic();
            }).catch(() => {
                console.log('Failed to play music on ' + this.device.uniqueId + ': ' + e.message);
            }).done();
    },
});
