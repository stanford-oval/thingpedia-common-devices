// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Andrew Lim <alim16@stanford.edu>
//                Xiangyu Yue <xyyue@stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

module.exports = new Tp.DeviceClass({
    Name: 'GithubDevice',
    UseOAuth2: Tp.Helpers.OAuth2({
        kind: 'com.github',
        client_id: '1396f80c995154c2dbda',
        client_secret: 'q72358so60p57o635404279813ssrq6pp10q3ns0',
        scope: ["user", "public_repo", "repo", "repo:status",
                "gist", "notifications"],
        authorize: 'https://github.com/login/oauth/authorize',
        get_access_token: 'https://github.com/login/oauth/access_token',

        // we need to force thingengine.stanford.edu as redirect uri
        // because github does not allow multiple redirect uris in the
        // configuration
        redirect_uri: 'https://thingengine.stanford.edu/devices/oauth2/callback/com.github',
        callback: function(engine, accessToken, refreshToken) {
            var auth = 'token ' + accessToken;
            var userAgent = 'ThingEngine-Github-Interface';
            return Tp.Helpers.Http.get('https://api.github.com/user',
                                       { auth: auth,
                                         'user-agent': userAgent,
                                         accept: 'application/json' })
                .then(function(response) {
                    var parsed = JSON.parse(response);
                    return engine.devices.loadOneDevice({ kind: 'com.github',
                                                          accessToken: accessToken,
                                                          refreshToken: refreshToken,
                                                          userId: parsed.id,
                                                          userName: parsed.login
                                                        }, true);
                });
        }
    }),

    _init: function(engine, state) {
        this.parent(engine, state);

        this.uniqueId = 'com.github-' + this.userId;
        this.globalName = 'github';
        this.name = "Github Account %s".format(this.userName);
        this.description = "This is your Github account";
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

    refreshCredentials: function() {
        // TODO: refresh the access token using the refresh token
    },
});

