// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const Tp = require('thingpedia');

module.exports = new Tp.DeviceClass({
    Name: 'FacebookDevice',
    UseOAuth2: Tp.Helpers.OAuth2({
        kind: 'com.facebook',
        client_id: '979879085397010',
        client_secret: '770o8qs05o487po44261r7701n46p549',
        scope: ['email', 'public_profile', 'user_friends', 'user_photos', 'publish_actions'],
        authorize: 'https://www.facebook.com/dialog/oauth',
        get_access_token: 'https://graph.facebook.com/oauth/access_token',
        callback: function(engine, accessToken, refreshToken) {
            return Tp.Helpers.Http.get('https://graph.facebook.com/me',
                                       { auth: "Bearer " + accessToken, accept: 'application/json' })
                .then(function(response) {
                    var parsed = JSON.parse(response);
                    return engine.devices.loadOneDevice({ kind: 'com.facebook',
                                                          accessToken: accessToken,
                                                          refreshToken: refreshToken,
                                                          profileId: parsed.id }, true);
                });
        }
    }),

    _init: function(engine, state) {
        this.parent(engine, state);

        this.uniqueId = 'com.facebook-' + this.profileId;
        this.name = "Facebook Account %s".format(this.profileId);
        this.description = "This is your Facebook Account. You can use it to access your wall, follow your friends and more.";
    },

    get profileId() {
        return this.state.profileId;
    },

    get accessToken() {
        return this.state.accessToken;
    },

    queryInterface: function(iface) {
        switch (iface) {
        case 'oauth2':
            return this;
        default:
            return null;
        }
    },

    refreshCredentials: function() {
        // FINISHME refresh the access token using the refresh token
    },
});
