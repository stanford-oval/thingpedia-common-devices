// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const Tp = require('thingpedia');

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
});

