// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
//

const Tp = require('thingpedia');

module.exports = new Tp.ChannelClass({
    Name: 'BluetoothA2dpSinkSetChannel',
    RequiredCapabilities: ['bluetooth', 'audio-router'],

    _init(engine, device) {
        this.parent();
        this.device = device;

        this._audioRouter = engine.platform.getCapability('audio-router');
    },

    _doOpen() {
        return this._audioRouter.start();
    },

    _doClose() {
        return this._audioRouter.stop();
    },

    sendEvent(event) {
        this._audioRouter.setAudioRouteBluetooth(this.device.hwAddress)
            .catch(() => {
                console.log('Failed to set ' + this.device.uniqueId + ' as bluetooth sink: ' + e.message);
            }).done();
    },
});
