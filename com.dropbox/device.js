// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Angela Xue <angelax@stanford.edu>
//                Bryce Taylor <btaylor3@stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

module.exports = new Tp.DeviceClass({
    Name: 'DropboxDevice',
    UseOAuth2: Tp.Helpers.OAuth2({
        kind: 'com.dropbox',
        authorize: 'https://www.dropbox.com/1/oauth2/authorize',
        get_access_token: 'https://api.dropboxapi.com/1/oauth2/token',
        callback: function(engine, accessToken, refreshToken) {
            var auth = 'Bearer ' + accessToken;
            return Tp.Helpers.Http.post('https://api.dropboxapi.com/2/users/get_current_account',
                                        JSON.stringify({ INPUT: 'null' }),
                                        { auth: auth,
                                          accept: 'application/json' })
                .then(function(response) {
                    var parsed = JSON.parse(response);
                    return engine.devices.loadOneDevice({ kind: 'com.dropbox',
                                                          accessToken: accessToken,
                                                          refreshToken: refreshToken,
                                                          userId: parsed.account_id,
                                                          userName: parsed.name.display_name,
                                                          email: parsed.email }, true);
                });
        }
    }),

    _init: function(engine, state) {
        this.parent(engine, state);

        this.uniqueId = 'com.dropbox-' + this.userId;
        this.name = "Dropbox Account %s".format(this.email);
        this.description = "This is the Dropbox Account owned by %s.".format(this.userName);
    },

    get userId() {
        return this.state.userId;
    },

    get userName() {
        return this.state.userName;
    },

    get email() {
        return this.state.email;
    },

    checkAvailable: function() {
        return Tp.Availability.AVAILABLE;
    }
});
