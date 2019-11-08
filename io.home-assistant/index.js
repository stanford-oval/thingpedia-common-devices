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

// FIXME make configurable
const HASS_URL = 'http://hassio.local:8123';

const DOMAIN_TO_TP_KIND = {
    'light': 'light-bulb',
    'sensor_battery': 'io.home-assistant.battery',
    'sensor_cold': 'io.home-assistant.cold',
    'sensor_connectivity': 'io.home-assistant.connectivity',
    'sensor_door': 'io.home-assistant.door',
    'sensor_garage_door': 'io.home-assistant.garage_door',
    'sensor_gas': 'io.home-assistant.gas',
    'sensor_heat': 'io.home-assistant.heat',
    'sensor_humidity': 'io.home-assistant.humidity',
    'sensor_illuminance': 'io.home-assistant.illuminance',
    'sensor_light': 'io.home-assistant.light',
    'sensor_lock': 'io.home-assistant.lock',
    'sensor_moisture': 'io.home-assistant.moisture',
    'sensor_motion': 'io.home-assistant.motion',
    'sensor_moving': 'io.home-assistant.moving',
    'sensor_occupancy': 'io.home-assistant.occupancy',
    'sensor_opening': 'io.home-assistant.opening',
    'sensor_plug': 'io.home-assistant.plug',
    'sensor_power': 'io.home-assistant.power',
    'sensor_presence': 'io.home-assistant.presence',
    'sensor_pressure': 'io.home-assistant.pressure',
    'sensor_problem': 'io.home-assistant.problem',
    'sensor_safety': 'io.home-assistant.safety',
    'sensor_signal_strength': 'io.home-assistant.signal_strength',
    'sensor_smoke': 'io.home-assistant.smoke',
    'sensor_sound': 'io.home-assistant.sound',
    'sensor_temperature': 'io.home-assistant.temperature',
    'sensor_timestamp': 'io.home-assistant.timestamp',
    'sensor_vibration': 'io.home-assistant.vibration',
    'sensor_window': 'io.home-assistant.window',
};
const SUBDEVICES = {
    'light-bulb': HomeAssistantLightbulbDevice,
};

for (let value in Object.values(DOMAIN_TO_TP_KIND)) {
    if (Object.values(DOMAIN_TO_TP_KIND)[value].includes('io.home-assistant')) {
        SUBDEVICES[Object.values(DOMAIN_TO_TP_KIND)[value]] = class extends HomeAssistantSensor {};
    }
}

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
        // const [,curr_type] = entityId.split('.');
        // const kind = DOMAIN_TO_TP_KIND[domain];
        let kind = undefined;
        if ((domain === 'sensor') || (domain === 'binary_sensor')) {
            kind = DOMAIN_TO_TP_KIND[`sensor_${attributes.device_class}`];
        } else {
            kind = DOMAIN_TO_TP_KIND[domain];
        }
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

    async updateOAuth2Token(accessToken, refreshToken, extraData) {
        this.state.accessToken = accessToken;
        // if the refresh token is single use, we will get a new one when we use it
        if (refreshToken)
            this.state.refreshToken = refreshToken;
        this.state.accessTokenExpires = extraData.expires_in * 1000 + Date.now();
        await this._connection.setSocket(await this._createSocket({ setupRetry: 10}));

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
