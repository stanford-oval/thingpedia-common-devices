// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const crypto = require('crypto');
const Tp = require('thingpedia');

function rot13(x) {
    return Array.prototype.map.call(x, function(ch) {
        var code = ch.charCodeAt(0);
        if (code >= 0x41 && code <= 0x5a)
            code = (((code - 0x41) + 13) % 26) + 0x41;
        else if (code >= 0x61 && code <= 0x7a)
            code = (((code - 0x61) + 13) % 26) + 0x61;

        return String.fromCharCode(code);
    }).join('');
}

module.exports = new Tp.DeviceClass({
    Name: 'JawboneUpDevice',
    Kinds: ['activity-tracker','fitness-tracker','sleep-tracker',
            'heartrate-monitor'],
    UseOAuth2: Tp.Helpers.OAuth2({
        kind: 'com.jawbone.up',
        client_id: 'v3sYocgyPaE',
        client_secret: '2pp9o8sr34n733no1o3s603s4sn4so2p81os095o',
        scope: ['basic_read', 'extended_read', 'location_read',
                'mood_read', 'mood_write', 'move_read', 'move_write',
                'sleep_read', 'sleep_write', 'meal_read', 'meal_write',
                'weight_read', 'weight_write', 'heartrate_read'],
        authorize: 'https://jawbone.com/auth/oauth2/auth',
        get_access_token: 'https://jawbone.com/auth/oauth2/token',
        callback: function(engine, accessToken, refreshToken) {
            var auth = 'Bearer ' + accessToken;
            return Tp.Helpers.Http.get('https://jawbone.com/nudge/api/v.1.1/users/@me',
                                       { auth: auth,
                                         accept: 'application/json' })
                .then(function(response) {
                    var parsed = JSON.parse(response);
                    console.log('parsed', parsed);
                    return engine.devices.loadOneDevice({ kind: 'com.jawbone.up',
                                                          accessToken: accessToken,
                                                          refreshToken: refreshToken,
                                                          userId: parsed.data.xid,
                                                          userName: parsed.data.first + ' ' + parsed.data.last }, true);
                });
        }
    }),

    _init: function(engine, state) {
        this.parent(engine, state);

        this.uniqueId = 'com.jawbone.up-' + this.userId;

        this.name = "Jawbone UP %s".format(this.userId);
        this.description = "This is a Jawbone UP owned by %s"
            .format(this.userName);

        this._hooks = {};
        this._hookCount = 0;
    },

    get userId() {
        return this.state.userId;
    },

    get userName() {
        return this.state.userName;
    },

    get accessToken() {
        return this.state.accessToken;
    },

    get refreshToken() {
        return this.state.refreshToken;
    },

    // it's cloud backed so always available
    checkAvailable: function() {
        return Tp.Availability.AVAILABLE;
    },

    queryInterface: function(iface) {
        switch (iface) {
        case 'oauth2':
            return this;
            // fallthrough
        default:
            return null;
        }
    },

    refreshCredentials: function() {
        // FINISHME refresh the access token using the refresh token
    },

    registerWebhook: function(hook, channel) {
        this._hooks[hook] = channel;
        this._hookCount++;
        if (this._hookCount === 1)
            this._doRegisterWebhook();
    },

    unregisterWebhook: function(hook) {
        delete this._hooks[hook];
        this._hookCount--;
        if (this._hookCount === 0)
            this._doUnregisterWebhook();
    },

    _onWebhook: function(method, query, headers, body) {
        var hash = crypto.createHash('sha256');
        hash.update('v3sYocgyPaE');
        hash.update(rot13('2pp9o8sr34n733no1o3s603s4sn4so2p81os095o'));
        var secretHash = hash.digest('hex');

        try {
            body.events.forEach(function(event) {
                if (event.action !== 'creation' && event.action !== 'updation')
                    return;

                var hook = this._hooks[event.type];
                if (!hook)
                    return;

                if (event.secret_hash !== secretHash)
                    console.log('Invalid secret hash on event, was ' + event.secret_hash + ', wanted ' + secretHash);
                hook.onHook(event.event_xid);
            }, this);
        } catch(e) {
            console.error('Failed to process Jawbone webhook call: ' + e.message);
        }
    },

    _doRegisterWebhook: function() {
        var webhookApi = this.engine.platform.getCapability('webhook-api');
        var base = webhookApi.getWebhookBase();
        var url = base + '/' + this.uniqueId;
        webhookApi.registerWebhook(this.uniqueId, this._onWebhook.bind(this));

        Tp.Helpers.Http.post('https://jawbone.com/nudge/api/v.1.1/users/@me/pubsub?webhook=' + encodeURIComponent(url), '',
                             { auth: 'Bearer ' + this.accessToken }).catch(function(e) {
            console.error('Failed to register Jawbone webhook: ' + e.message);
        }).done();
    },

    _doUnregisterWebhook: function() {
        var webhookApi = this.engine.platform.getCapability('webhook-api');
        webhookApi.unregisterWebhook(this.uniqueId);

        Tp.Helpers.Http.request('https://jawbone.com/nudge/api/v.1.1/users/@me/pubsub', 'DELETE', '',
                                { auth: 'Bearer ' + this.accessToken }).catch(function(e) {
            console.error('Failed to unregister Jawbone webhook: ' + e.message);
        }).done();
    }
});

