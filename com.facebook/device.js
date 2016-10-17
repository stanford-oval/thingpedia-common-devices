// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

module.exports = new Tp.DeviceClass({
    Name: 'FacebookDevice',
    UseOAuth2: Tp.Helpers.OAuth2({
        kind: 'com.facebook',
        scope: ['email', 'public_profile', 'user_friends', 'publish_actions'],
        authorize: 'https://www.facebook.com/v2.7/dialog/oauth',
        get_access_token: 'https://graph.facebook.com/oauth/access_token',

        // we need to force thingengine.stanford.edu as redirect uri
        // because we're half-lying to facebook and claiming we're a website instead
        // of a mobile app
        redirect_uri: 'https://thingengine.stanford.edu/devices/oauth2/callback/com.facebook',
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
    }
});
