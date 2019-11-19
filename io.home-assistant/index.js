// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of io.home-assistant
//
// Copyright 2019 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');
const WebSocket = require('ws');
const HomeAssistant = require('home-assistant-js-websocket');

const HomeAssistantLightbulbDevice = require('./light-bulb');
const HomeAssistantSensor = require('./sensor');
const HomeAssistantCover = require('./cover');
const HomeAssistantFan = require('./fan');
const HomeAssistantSwitch = require('./switch');
const HomeAssistantVacuum = require('./vacuum');

// FIXME make configurable
const HASS_URL = 'http://hassio.local:8123';

const DOMAIN_TO_TP_KIND = {
    'light': 'light-bulb',
    'cover_active': 'io.home-assistant.cover',
    'fan': 'io.home-assistant.fan',
    'switch': 'io.home-assistant.switch',
    'vacuum': 'io.home-assistant.vacuum',
    'sensor_air': 'io.home-assistant.air',
    'sensor_battery': 'io.home-assistant.battery',
    'sensor_connectivity': 'io.home-assistant.connectivity',
    'sensor_door': 'io.home-assistant.door',
    'sensor_heat': 'io.home-assistant.heat',
    'sensor_motion': 'io.home-assistant.motion',
    'sensor_occupancy': 'io.home-assistant.occupancy',
    'sensor_plug': 'io.home-assistant.plug',
    'sensor_sound': 'io.home-assistant.sound'
};
const SUBDEVICES = {
    'light-bulb': HomeAssistantLightbulbDevice,
    'io.home-assistant.cover': HomeAssistantCover,
    'io.home-assistant.fan': HomeAssistantFan,
    'io.home-assistant.switch': HomeAssistantSwitch,
    'io.home-assistant.vacuum': HomeAssistantVacuum
};

Object.entries(DOMAIN_TO_TP_KIND).forEach(([key,value]) => {
    if (key.includes('sensor'))
        SUBDEVICES[value] = class extends HomeAssistantSensor {};
});

class HomeAssistantDeviceSet extends Tp.Helpers.ObjectSet.Base {
    constructor(master) {
        super();
        this.master = master;
        this._devices = new Map;

        this._unsubscribe = null;
    }

    _maybeAddEntity(entityId, state, attributes) {
        const existing = this._devices.get(entityId);
        if (existing) {
            existing.updateState({
                kind: existing.state.kind,
                state, attributes
            });
            return;
        }

        const [domain,] = entityId.split('.');
        let kind = undefined;
        if (domain === 'binary_sensor' && ['smoke', 'gas'].includes(attributes.device_class))
            kind = DOMAIN_TO_TP_KIND['sensor_air'];
        else if (domain === 'binary_sensor' && ['heat', 'cold'].includes(attributes.device_class))
            kind = DOMAIN_TO_TP_KIND['sensor_heat'];
        else if (domain === 'binary_sensor' && attributes.device_class === 'window')
            kind = DOMAIN_TO_TP_KIND['cover_active'];
        else if ((domain === 'sensor') || (domain === 'binary_sensor') || (domain === 'cover' && attributes.device_class === 'door'))
            kind = DOMAIN_TO_TP_KIND[`sensor_${attributes.device_class}`];
        else if (domain === 'cover')
            kind = DOMAIN_TO_TP_KIND['cover_active'];
        else
            kind = DOMAIN_TO_TP_KIND[domain];

        if (kind === undefined) {
            console.log(`Unhandled Home Assistant entity ${entityId} with domain ${domain}`);
            return;
        }
        const deviceClass = SUBDEVICES[kind];
        const device = new deviceClass(
            this.engine, { kind, state, attributes }, this.master, entityId);
        this._devices.set(entityId, device);
        this.objectAdded(device);
    }

    _maybeDeleteEntity(entityId) {
        const device = this._devices.get(entityId);
        if (!device)
            return;
        this._devices.delete(entityId);
        this.objectRemoved(device);
    }

    async start() {
        const existing = await HomeAssistant.getStates(this.master.connection);

        for (let entity of existing)
            this._maybeAddEntity(entity.entity_id, entity.state, entity.attributes);

        this._unsubscribe = this.master.connection.subscribeEvents((event) => {
            const { entity_id, new_state } = event.data;
            if (new_state)
                this._maybeAddEntity(entity_id, new_state.state, new_state.attributes);
            else
                this._maybeDeleteEntity(entity_id);
        }, 'state_changed');
    }

    async stop() {
        if (this._unsubscribe) {
            this._unsubscribe();
            this._unsubscribe = null;
        }
    }

    values() {
        return Array.from(this._devices.values());
    }
}

module.exports = class HomeAssistantGateway extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);

        this.uniqueId = 'io.home-assistant/' + state.hassUrl;

        // FIXME i18n
        this.name = `Home Assistant Gateway at ${state.hassUrl}`;
        this._subdevices = new HomeAssistantDeviceSet(this);

        // if this device was configured through hassio, mark it as transient
        // (not stored on disk) because the access token will expire the next
        // time the addon or hass.io is restarted
        // no matter what, at the next restart the addon setup code will create
        // the new device with the new good token
        this.isTransient = !!state.isHassio;
    }

    static async loadFromOAuth2(engine, accessToken, refreshToken, extraData) {
        const expires = extraData.expires_in * 1000 + Date.now();
        return new HomeAssistantGateway(engine, {
            kind: 'io.home-assistant',

            hassUrl: HASS_URL,
            accessToken, refreshToken,
            accessTokenExpires: expires,
        });
    }

    get hassUrl() {
        return this.state.hassUrl;
    }

    get accessTokenExpires() {
        return this.state.accessTokenExpires;
    }

    get _accessTokenExpired() {
        return Date.now() > this.state.accessTokenExpires;
    }

    get connection() {
        return this._connection;
    }

    // note: updateState is not async, we must have the new .state property
    // by the time this returns
    updateState(newState) {
        const oldAccessToken = this.state.accessToken;
        super.updateState(newState);

        // reconnect asynchronously, ignore errors
        if (oldAccessToken !== this.state.accessToken)
            this._reconnect();
    }

    async _reconnect() {
        try {
            await this._connection.setSocket(await this._createSocket({ setupRetry: 10}));
        } catch(e) {
            console.error(`Failed to reconnect to Home Assistant: ` + e);
        }
    }

    async updateOAuth2Token(accessToken, refreshToken, extraData) {
        this.state.accessToken = accessToken;
        // if the refresh token is single use, we will get a new one when we use it
        if (refreshToken)
            this.state.refreshToken = refreshToken;
        this.state.accessTokenExpires = extraData.expires_in * 1000 + Date.now();
        await this._reconnect();

        this.stateChanged();
    }

    queryInterface(iface) {
        switch (iface) {
        case 'subdevices':
            return this._subdevices;
        default:
            return super.queryInterface(iface);
        }
    }

    async _doStart() {
        try {
            this._connection = await HomeAssistant.createConnection({
                createSocket: this._createSocket.bind(this),
                setupRetry: 10,
            });
            await this._subdevices.start();
        } catch(e) {
            console.error(e);
        }
    }

    async start() {
        // start asynchronously as to not block Home Assistant from starting
        // while it's waiting for /devices/create to return (which causes us
        // to fail to connect)
        this._doStart();
    }

    async stop() {
        await this._subdevices.stop();
    }

    async _createSocket(options) {
        if (this._accessTokenExpired)
            await this.refreshCredentials();

        // Convert from http:// -> ws://, https:// -> wss://
        const wsUrl = `ws${this.hassUrl.substring(4)}/api/websocket`;

        // If invalid auth, we will not try to reconnect.
        let invalidAuth = false;

        return new Promise((resolve, reject) => {
            const connect = (triesLeft) => {
                console.log(`Home Assistant: connection attempt ${options.setupRetry - triesLeft + 1}/${options.setupRetry}`);
                const socket = new WebSocket(wsUrl);

                const onClose = () => {
                    socket.removeListener('close', onClose);

                    if (invalidAuth) {
                        reject(HomeAssistant.ERR_INVALID_AUTH);
                        return;
                    }

                    if (triesLeft === 0) {
                        reject(HomeAssistant.ERR_CANNOT_CONNECT);
                        return;
                    }

                    const newTries = triesLeft === -1 ? -1 : triesLeft - 1;
                    // try again in a second
                    setTimeout(() => connect(newTries), 1000);
                };
                const onOpen = async () => {
                    try {
                        if (this._accessTokenExpired)
                            await this.refreshCredentials();
                        socket.send(JSON.stringify({ type: 'auth', access_token: this.accessToken }));
                    } catch(e) {
                        console.error('failed to send auth message', e);
                        invalidAuth = true;
                        socket.close();
                    }
                };
                const onMessage = (data) => {
                    const message = JSON.parse(data);

                    switch (message.type) {
                    case 'auth_invalid':
                        invalidAuth = true;
                        socket.close();
                        break;

                    case 'auth_ok':
                        socket.removeListener('close', onClose);
                        socket.removeListener('open', onOpen);
                        socket.removeListener('message', onMessage);
                        resolve(socket);
                        break;
                    }
                };

                socket.on('close', onClose);
                socket.on('open', onOpen);
                socket.on('message', onMessage);
                socket.on('error', (error) => {
                    console.error('Error on Home Assistant websocket: ' + error);
                });
            };

            connect(options.setupRetry);
        });
    }
};
module.exports.subdevices = SUBDEVICES;
