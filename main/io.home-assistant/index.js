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

const HomeAssistantClimate = require('./climate');
const HomeAssistantCover = require('./cover');
const HomeAssistantFan = require('./fan');
const HomeAssistantLightbulb = require('./light-bulb');
const HomeAssistantLock = require('./lock');
const HomeAssistantMediaPlayer = require('./media-player');
const HomeAssistantSensor = require('./sensor');
const HomeAssistantSwitch = require('./switch');
const HomeAssistantVacuum = require('./vacuum');

// FIXME make configurable
const HASS_URL = 'http://hassio.local:8123';

// map to a Home Assistant domain to a specific Thingpedia device
const DOMAIN_TO_TP_KIND = {
    // devices with dedicated APIs
    'cover': 'org.thingpedia.iot.cover',
    'fan': 'org.thingpedia.iot.fan',
    'light': 'org.thingpedia.iot.light-bulb',
    'lock': 'org.thingpedia.iot.lock',
    'switch': 'org.thingpedia.iot.switch',
    'climate': 'org.thingpedia.iot.climate',
    'vacuum': 'org.thingpedia.iot.vacuum', 
    
    // media players
    //'media_player': 'org.thingpedia.iot.media-player',
    //'media_player_speaker': 'org.thingpedia.iot.speaker',
    //'media_player_tv': 'org.thingpedia.iot.tv',

    // sensors and binary sensors (implemented by HomeAssistantSensor)
    //'sensor_air': 'org.thingpedia.iot.air',
    'sensor_battery': 'org.thingpedia.iot.battery',
    'sensor_door': 'org.thingpedia.iot.door',
    'sensor_flood': 'org.thingpedia.iot.flood',
    'sensor_humidity': 'org.thingpedia.iot.humidity',
    'sensor_illuminance': 'org.thingpedia.iot.illuminance',
    'sensor_motion': 'org.thingpedia.iot.motion',
    //'sensor_smoke': 'org.thingpedia.iot.smoke',
    'sensor_temperature': 'org.thingpedia.iot.temperature',
    'sensor_uv': 'org.thingpedia.iot.uv'
    
    //'sensor_heat': 'org.thingpedia.iot.heat',
    //'sensor_moisture': 'org.thingpedia.iot.moisture',
    //'sensor_plug': 'org.thingpedia.iot.plug',
    //'sensor_occupancy': 'org.thingpedia.iot.occupancy',
    //'sensor_sound': 'org.thingpedia.iot.sound',
};

// provide implementations for various abstract & embedded Thingpedia devices
// we can provide implementation for devices that are not in the enabled portion of
// Thingpedia yet (and the implementation will not be loaded)
//
// many devices use the shared HomeAssistantSensor class, as they just expose the
// sensor value from Home Assistant and if necessary map it to the right enum
// those are handled immediately below by creating anonymous classes
// note that we need to create distinct JS classes for each Thingpedia class because the
// Thingpedia loading code will attach metadata to the JS class
const SUBDEVICES = {
    'org.thingpedia.iot.cover': HomeAssistantCover,
    'org.thingpedia.iot.climate': HomeAssistantClimate,
    'org.thingpedia.iot.fan': HomeAssistantFan,
    'org.thingpedia.iot.light-bulb': HomeAssistantLightbulb,
    'org.thingpedia.iot.lock': HomeAssistantLock,
    'org.thingpedia.iot.media-player': HomeAssistantMediaPlayer,
    'org.thingpedia.iot.switch': HomeAssistantSwitch,
    'org.thingpedia.iot.vacuum': HomeAssistantVacuum
};
Object.entries(DOMAIN_TO_TP_KIND).forEach(([key,value]) => {
    if (key.includes('sensor') && !(value in SUBDEVICES))
        SUBDEVICES[value] = class extends HomeAssistantSensor {};
});

class HomeAssistantDeviceSet extends Tp.Helpers.ObjectSet.Base {
    constructor(master) {
        super();
        this.master = master;
        this._devices = new Map;
        this._warned = new Set;

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

        // Do not add entities without a friendly name.
        if (!attributes.friendly_name)
            return;

        const [domain,] = entityId.split('.');
        let kind = undefined;
        if (domain === 'binary_sensor' && ['smoke', 'gas', 'CO', 'CO2'].includes(attributes.device_class))
            kind = DOMAIN_TO_TP_KIND['air'];
        else if (domain === 'sensor' && ['smoke'].includes(attributes.device_class))
            kind = DOMAIN_TO_TP_KIND['sensor_smoke'];   
        else if (domain === 'lock' || attributes.device_class === 'lock')
            kind = DOMAIN_TO_TP_KIND['lock'];
        else if (domain === 'binary_sensor' && ['heat', 'cold'].includes(attributes.device_class))
            kind = DOMAIN_TO_TP_KIND['heat'];
        else if ((domain === 'sensor' || domain === 'binary_sensor') && attributes.device_class === 'battery')
            kind = DOMAIN_TO_TP_KIND['sensor_battery'];
        else if (domain === 'binary_sensor' && (attributes.device_class === 'window' || attributes.device_class === 'garage_door' || attributes.device_class === 'door'))
            kind = DOMAIN_TO_TP_KIND['sensor_door'];
        else if ((domain === 'sensor') || (domain === 'binary_sensor'))
            kind = DOMAIN_TO_TP_KIND[`sensor_${attributes.device_class}`];
        //else if (domain === 'media_player' && attributes.device_class !== '')
        //    kind = DOMAIN_TO_TP_KIND[`media_player_${attributes.device_class}`];
        else
            kind = DOMAIN_TO_TP_KIND[domain];

        if (kind === undefined) { //ADD auto-discover
            if (!this._warned.has(entityId)) {
                console.log(`Unhandled HA entity ${entityId} - domain ${domain} -> device class ${attributes.device_class}`);
                this._warned.add(entityId);
            }
            return;
        }
        const deviceClass = SUBDEVICES[kind];
        const device = new deviceClass(
            this.master.engine, { kind, state, attributes }, this.master, entityId);
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
        this._subdevices = new HomeAssistantDeviceSet(this);

        // if this device was configured through hassio, mark it as transient
        // (not stored on disk) because the access token will expire the next
        // time the addon or hass.io is restarted
        // no matter what, at the next restart the addon setup code will create
        // the new device with the new good token
        this.isTransient = !!state.isHassio;

        if (!Tp.Helpers.Content.isPubliclyAccessible(state.hassUrl) &&
            this.platform.type === 'cloud')
            throw new Error(`Web Almond can only connect to publicly accessible Home Assistant instances`);
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
