// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const tls = require('tls');
const Q = require('q');
const WebSocket = require('ws');

const Tp = require('thingpedia');

const SetPowerAction = require('./set_power');

const PERMISSIONS = [
    'LAUNCH',
    'LAUNCH_WEBAPP',
    'APP_TO_APP',
    'CONTROL_AUDIO',
    'CONTROL_INPUT_MEDIA_PLAYBACK',
    'CONTROL_POWER',
    'READ_INSTALLED_APPS',
    'CONTROL_DISPLAY',
    'CONTROL_INPUT_JOYSTICK',
    'CONTROL_INPUT_MEDIA_RECORDING',
    'CONTROL_INPUT_TV',
    'READ_INPUT_DEVICE_LIST',
    'READ_NETWORK_STATE',
    'READ_TV_CHANNEL_LIST',
    'WRITE_NOTIFICATION_TOAST',
    'CONTROL_INPUT_TEXT',
    'CONTROL_MOUSE_AND_KEYBOARD',
    'READ_CURRENT_CHANNEL',
    'READ_RUNNING_APPS'
];

class LgWebsocket {
    constructor(host, clientKey, cert) {
        this.host = host;
        this.clientKey = clientKey;
        this.cert = cert || null;

        this._requestId = 0;
        this._requests = {};

        this._registerId = null;
        this._registerPromise = null;
    }

    open() {
        return Q.Promise((callback, errback) => {
            this._socket = new WebSocket('wss://' + this.host + ':3001', {
                agent: false,
                rejectUnauthorized: false
            });
            this._socket.on('message', this._handleMessage.bind(this));
            this._socket.on('open', () => {
                var tlsSocket = this._socket._socket;
                console.log(typeof tlsSocket.getPeerCertificate);
                if (typeof tlsSocket.getPeerCertificate === 'function') {
                    var serverCert = tlsSocket.getPeerCertificate(false);
                    if (this.cert !== null) {
                        // verify certificate
                        if (serverCert.fingerprint !== this.cert) {
                            this._socket.terminate();
                            errback(new Error("Invalid certificate"));
                            return;
                        }
                    } else {
                        this.cert = serverCert.fingerprint;
                    }
                }

                this.sendRaw({
                    id: this._requestId++,
                    type: 'hello',
                    payload: {
                        sdkVersion: '1.0',
                        deviceModel: 'android',
                        OSVersion: '21',
                        resolution: '1440x900',
                        appId: 'edu.stanford.thingengine',
                        appName: "Sabrina",
                        appRegion: 'US'
                    }
                });
                callback();
            });
            this._socket.on('error', errback);
        });
    }

    _handleMessage(data) {
        console.log('websocket message', data);
        var parsed;
        try {
            parsed = JSON.parse(data);
        } catch(e) {
            this._socket.terminate();
            return;
        }

        switch (parsed.type) {
            case 'hello':
                // ignore the hello reply, it has some version info
                // and metadata but we don't care too much
                return;

            case 'response':
                if (!this._requests[parsed.id])
                    return;
                var req = this._requests[parsed.id];
                delete this._requests[parsed.id];
                req.resolve(parsed.payload);
                return;

            case 'error':
                if (parsed.id === this._registerId) {
                    this._registerPromise.reject(new Error(parsed.error));
                    this._registerPromise = null;
                    this._requestId = null;
                    return;
                }
                if (!this._requests[parsed.id])
                    return;
                var req = this._requests[parsed.id];
                delete this._requests[parsed.id];
                req.reject(new Error(parsed.error));
                return;

            case 'registered':
                this.clientKey = parsed.payload['client-key'];
                this._registerPromise.resolve();
                return;

            default:
                console.log('Ignored WebOS protocol message of type ' + parsed.type);
        }
    }

    close() {
        this._socket.close();
    }

    sendRaw(obj) {
        this._socket.send(JSON.stringify(obj));
    }

    sendRegister(pin) {
        this._registerId = this._requestId++;
        this._registerPromise = Q.defer();

        if (this.clientKey !== null) {
            this.sendRaw({
                id: this._registerId,
                type: 'register',
                payload: {
                    'client-key': this.clientKey
                }
            });
        } else {
            this.sendRaw({
                id: this._registerId,
                type: 'register',
                payload: {
                    pairingType: 'PIN',
                    manifest: {
                        manifestVersion: 1,
                        permissions: PERMISSIONS
                    }
                }
            });
        }

        return this._registerPromise.promise;
    }

    sendPin(pin) {
        this.sendRaw({
            id: this._requestId++,
            type: 'request',
            uri: 'ssap://pairing/setPin',
            payload: {
                pin: pin
            }
        });
    }

    sendRequest(uri, payload) {
        var id = this._requestId++;
        this._requests[id] = Q.defer();

        this.sendRaw({
            id: id,
            type: 'request',
            uri: uri,
            payload: payload
        });
        return this._requests[id].promise;
    }
}

function makeAction(url, payload) {
    return new Tp.ChannelClass({
        Name: 'SetPowerAction',

        _doOpen() {
            return this.device.refWebsocket();
        },

        _doClose() {
            return this.device.unrefWebsocket();
        },

        sendEvent(event) {
            var power = event[0];

            if (event === true) // the tv is already on if we get here
                return Q();
            else
                return this.device.queryInterface('lg-websocket').sendRequest(url, payload ? payload(event) : undefined);
        }
    });
}
const PlayAnything = makeAction('ssap://media.viewer/open', function(event) {
    return { target: event[0] };
});
const PlayYoutube = makeAction('ssap://system.launcher/launch', function(event) {
    return { id: 'youtube.leanback.v4',
             contentId: event[0] };
});
const PlayNetflix = makeAction('ssap://system.launcher/launch', function(event) {
    return { id: 'netflix',
             contentId: event[0] };
});
const PlayAmazon = makeAction('ssap://system.launcher/launch', function(event) {
    return { id: 'amazon.html',
             contentId: event[0] };
});
const RaiseVolume = makeAction('ssap://audio/volumeUp');
const LowerVolume = makeAction('ssap://audio/volumeDown');
const SetVolume = makeAction('ssap://audio/setVolume', function(event) {
    return { volume: Math.round(event[0]) };
});
const Mute = makeAction('ssap://audio/setMute', function(event) {
    return { mute: true };
});
const Unmute = makeAction('ssap://audio/setMute', function(event) {
    return { mute: false };
});

const LgTvDevice = new Tp.DeviceClass({
    Name: 'LgTvDevice',
    UseDiscovery(engine, publicData, privateData) {
        return new LgTvDevice(engine,
                              { kind: 'com.lg.tv.webos2',
                                discoveredBy: engine.ownTier,
                                uuid: privateData.uuid,
                                host: privateData.host,
                                port: privateData.port
                               });
    },

    _init: function(engine, state) {
        this.parent(engine, state);

        this.uniqueId = 'com.lg.tv.webos2-' + state.uuid;
        this.name = "LG Smart TV (%s)".format(state.host);
        this.description = "This is a LG Smart TV.";
        this.descriptors = ['upnp/' + state.uuid];

        this._initialized = false;
        this._websocket = null;
        this._websocketRefCount = 0;
    },

    get uuid() {
        return this.state.uuid;
    },

    get host() {
        return this.state.host;
    },

    get port() {
        return this.state.port;
    },

    get clientKey() {
        return this.state.clientKey;
    },

    refWebsocket() {
        this._websocketRefCount++;

        if (this._websocketRefCount === 1) {
            var ws = new LgWebsocket(this.host, this.clientKey, this.cert);
            this._websocket = ws;
            return ws.open().then(() => {
                return ws.sendRegister();
            }).then(() => {
                return ws;
            });
        } else {
            return Q(this._websocket);
        }
    },

    unrefWebsocket() {
        // wait 30 seconds before closing the connection on last use
        setTimeout(() => {
            this._websocketRefCount--;
            if (this._websocketRefCount === 0) {
                this._websocket.close();
                this._websocket = null;
            }
        }, 30000);
    },

    completeDiscovery(delegate) {
        if (this.clientKey) {
            delegate.configDone();
            return;
        }

        if (this._websocket)
            this._websocket.close();
        this._websocket = new LgWebsocket(this.host, null, null);
        this._websocketRefCount = 1;

        return this._websocket.open().then(() => {
            // registration and PIN request from the user need to happen in parallel
            // (ideally, requesting the PIN would be nested in the sendRegister, but
            // that confuses the code in the case we have the client key already)

            var code = delegate.requestCode("Please enter the PIN shown on your TV.").then((pin) => {
                return this._websocket.sendPin(pin.trim());
            });
            var register = this._websocket.sendRegister();
            return Q.all([code, register]);
        }).then(() => {
            this.state.clientKey = this._websocket.clientKey;
            this.state.cert = this._websocket.cert;
            this.engine.devices.addDevice(this);

            this.unrefWebsocket();
            delegate.configDone();
        }).catch((e) => {
            delegate.configFailed(e);
        });
    },

    queryInterface(iface) {
        switch(iface) {
        case 'lg-websocket':
            return this._websocket;

        default:
            return this.parent(iface);
        }
    },

    getActionClass(id) {
        switch(id) {
        case 'sink':
            return PlayAnything;
        case 'play_amazon':
            return PlayAmazon;
        case 'play_youtube':
            return PlayYoutube;
        case 'play_netflix':
            return PlayNetflix;
        case 'raise_volume':
            return RaiseVolume;
        case 'lower_volume':
            return LowerVolume;
        case 'set_volume':
            return SetVolume;
        case 'mute':
            return Mute;
        case 'unmute':
            return Unmute;
        default:
            return this.parent(id);
        }
    }
});
module.exports = LgTvDevice;
