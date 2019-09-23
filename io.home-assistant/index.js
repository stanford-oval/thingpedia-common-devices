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

// FIXME make configurable
const HASS_URL = 'http://hassio.local:8123';

class HomeAssistantDevice extends Tp.BaseDevice {
    constructor(engine, state, master, entityId) {
        super(engine, state);

        this.master = master;
        this._entityId = entityId;
        this.uniqueId = master.uniqueId + '/' + entityId;
        this.name = this.state.friendly_name;
    }

    updateState(state) {
        super.updateState(state);
        this.name = this.state.friendly_name;
    }

    _callService(domain, service, data = {}) {
        data.entity_id = this._entityId;
        return HomeAssistant.callService(this.master.connection, domain, service, data);
    }
}

class HomeAssistantLightbulbDevice extends HomeAssistantDevice {
    constructor(engine, state, master, entityId) {
        super(engine, state, master, entityId);

        this.uniqueId = master.uniqueId + '/' + entityId;
    }

    async do_set_power({ power }) {
        if (power === 'on')
            await this._callService('light', 'turn_on');
        else
            await this._callService('light', 'turn_off');
    }

    async do_alert_long() {
        await this._callService('light', 'turn_on', { flash: 'long' });
    }

    async do_color_loop() {
        await this._callService('light', 'turn_on', { effect: 'colorloop' });
    }
}

class HomeAssistantDeviceSet extends Tp.Helpers.ObjectSet.Base {
    constructor(master) {
        super();
        this.master = master;
        this._devices = new Map;

        this._unsubscribe = null;
    }

    _maybeAddEntity(entityId, entityData) {
        const existing = this._devices.get(entityId);
        if (existing) {
            // add "kind" property that Tp expects
            entityData.kind = existing.state.kind;
            existing.updateState(entityData);
            return;
        }

        const [type,] = entityId.split('.');

        let device;
        switch (type) {
        case 'light':
            device = new HomeAssistantLightbulbDevice(this.engine, entityData, this.master, entityId);
            break;
        default:
            console.log(`Unhandled Home Assistant entity ${entityId} of type ${type}`);
            return;
        }

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

        for (let entityId in existing)
            this._maybeAddEntity(entityId, existing[entityId]);

        this._unsubscribe = this.master.connection.subscribeEvents(({ entity_id, new_state }) => {
            if (new_state)
                this._maybeAddEntity(entity_id, new_state);
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

        this.uniqueId = 'io.home-assistant/' + HASS_URL;

        // FIXME i18n
        this.name = `Home Assistant Gateway at ${HASS_URL}`;
    }

    static get subdevices() {
        return {
            'light-bulb': HomeAssistantLightbulbDevice
        };
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

    async start() {
        this._connection = HomeAssistant.createConnection({
            createSocket: this._createSocket.bind(this)
        });
        this._subdevices = new HomeAssistantDeviceSet(this);
    }

    async _createSocket(options) {
        if (this._accessTokenExpired)
            await this.refreshCredentials();

        // Convert from http:// -> ws://, https:// -> wss://
        const wsUrl = `ws${this._device.hassUrl.substr(4)}/api/websocket`;

        // If invalid auth, we will not try to reconnect.
        let invalidAuth = false;

        return new Promise((resolve, reject) => {
            const connect = (triesLeft) => {
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
                        socket.send(JSON.stringify(HomeAssistant.messages.auth(this.accessToken)));
                    } catch(e) {
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
            };

            connect(options.setupRetry);
        });
    }

};
