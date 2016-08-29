// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Silei Xu <silei@stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

module.exports = new Tp.DeviceClass({
    Name: "GMailAccount",

    UseOAuth2: Tp.Helpers.OAuth2({
        scope: ['openid', 'profile', 'email', 'https://mail.google.com/'],
        authorize: 'https://accounts.google.com/o/oauth2/auth',
        get_access_token: 'https://www.googleapis.com/oauth2/v3/token',
        callback: function(engine, accessToken, refreshToken) {
            var auth = 'Bearer ' + accessToken;
            return Tp.Helpers.Http.get('https://www.googleapis.com/oauth2/v2/userinfo', {auth: auth, accept: 'application/json'})
            .then(function(response) {
                var parsed = JSON.parse(response);
                return engine.devices.loadOneDevice({
                    kind: 'com.gmail',
                    accessToken: accessToken,
                    refreshToken: refreshToken,
                    userId: parsed.id,
                    userName: parsed.name
                }, true);
            });
        } 
    }),

    _init: function(engine, state) {
        this.parent(engine, state);
        this.uniqueId = 'com.gmail.' + this.userId;
        this.name = "Gmail Account %s".format(this.userName);
        this.description = "This is your Gmail Account. You can use it access and manage your emails.";
    },

    get userId() {
        return this.state.userId;
    },

    get userName() {
        return this.state.userName;
    }
});
