// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Sunkyu Lim <limsk1@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

module.exports = new Tp.DeviceClass({
    Name: 'InstagramAccountDevice',
    UseOAuth2: Tp.Helpers.OAuth2({
        kind: 'com.instagram',
        client_id: 'fbd0f2d229ff4db38e58c2c3a193a710',
        client_secret: '4q41qr80n1544q2po63q91461p7r2226',
        scope: ['basic'],
        authorize: 'https://api.instagram.com/oauth/authorize/',
        get_access_token: 'https://api.instagram.com/oauth/access_token',
        callback: function(engine, accessToken, refreshToken) {
            return Tp.Helpers.Http.get('https://api.instagram.com/v1/users/self/?access_token=' + accessToken, {
                    accept: 'application/json'
                })
                .then(function(response) {
                    var parsed = JSON.parse(response);
                    return engine.devices.loadOneDevice({
                        kind: 'com.instagram',
                        accessToken: accessToken,
                        userId: parsed.data.id,
                        userName: parsed.data.username,
                        fullName: parsed.data.full_name
                    }, true);
                });
        }
    }),

    _init: function(engine, state) {
        this.parent(engine, state);
        this.state = state;

        this.uniqueId = 'com.instagram-' + this.userId;
        this.name = "Instagram %s".format(this.userName);
        this.description = "This is an Instagram account owned by %s".format(this.fullName);
    },

    get userId() {
        return this.state.userId;
    },

    get userName() {
        return this.state.userName;
    },

    get fullName() {
        return this.state.fullName;
    },

    get accessToken() {
        return this.state.accessToken;
    },

    // it's cloud backed so always available
    checkAvailable: function() {
        return Tp.Availability.AVAILABLE;
    },

    queryInterface: function(iface) {
        switch (iface) {
            case 'oauth2':
                return this;
            default:
                return null;
        }
    },

});
