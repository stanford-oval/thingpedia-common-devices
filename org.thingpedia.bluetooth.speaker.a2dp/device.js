// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

const VolumeBase = require('./volume_adjust_base');
const RaiseVolume = VolumeBase('RaiseVolume', true, +1);
const LowerVolume = VolumeBase('LowerVolume', true, -1);
const SetVolume = VolumeBase('SetVolume', false);

const BluetoothA2dpSinkDevice = new Tp.DeviceClass({
    Name: 'BluetoothA2dpSinkDevice',

    UseDiscovery(engine, publicData, privateData) {
        return new BluetoothA2dpSinkDevice(engine,
                                           { kind: 'org.thingpedia.bluetooth.speaker.a2dp',
                                             discoveredBy: engine.ownTier,
                                             paired: privateData.paired,
                                             uuids: publicData.uuids,
                                             class: publicData.class,
                                             hwAddress: privateData.address,
                                             alias: privateData.alias }, true);
    },

    _init(engine, state) {
        this.parent(engine, state);

        this.alias = state.alias;
        this.hwAddress = state.hwAddress;

        this.uniqueId = 'org.thingpedia.bluetooth.speaker.a2dp.generic-' + state.hwAddress.replace(/:/g,'-');
        this.descriptors = ['bluetooth/' + state.hwAddress];

        this.name = "A2DP Bluetooth Speaker %s".format(this.alias);
        this.description = "This is a Bluetooth speaker capabable of playing high-fidelity music";
    },

    completeDiscovery(delegate) {
        if (this.state.paired) {
            this.engine.devices.addDevice(this);
            delegate.configDone();
            return Q();
        }

        if (!this.engine.platform.hasCapability('bluetooth')) {
            delegate.configFailed(new Error("Platform has no bluetooth capability"));
            return Q();
        }

        var btApi = this.engine.platform.getCapability('bluetooth');
        return btApi.pairDevice(this.hwAddress).then(() => {
            this.state.paired = true;
            this.engine.devices.addDevice(this);
            delegate.configDone();
        }).catch((e) => {
            delegate.configFailed(e);
        });
    },

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
    },

    getActionClass(id) {
        switch(id) {
        case 'raise_volume':
            return RaiseVolume;
        case 'lower_volume':
            return LowerVolume;
        case 'set_volume':
            return SetVolume;
        default:
            return this.parent(id);
        }
    }
});
module.exports = BluetoothA2dpSinkDevice;
