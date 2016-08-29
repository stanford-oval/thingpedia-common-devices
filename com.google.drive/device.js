// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const Tp = require('thingpedia');

module.exports = new Tp.DeviceClass({
    Name: 'GoogleAccountDevice',
    UseOAuth2: Tp.Helpers.OAuth2({
		kind: 'com.google.drive',
		scope: ['openid','profile','email',
                'https://www.googleapis.com/auth/drive',
                'https://www.googleapis.com/auth/drive.appdata',
                'https://www.googleapis.com/auth/drive.file'],
		authorize: 'https://accounts.google.com/o/oauth2/auth',
		get_access_token: 'https://www.googleapis.com/oauth2/v3/token',
        set_access_type: true,
		callback: function(engine, accessToken, refreshToken) {
			var auth = 'Bearer ' + accessToken;
			return Tp.Helpers.Http.get('https://www.googleapis.com/oauth2/v2/userinfo', { auth: auth, accept: 'application/json' })
			.then(function(response) {
				var parsed = JSON.parse(response);
				return engine.devices.loadOneDevice({ kind: 'com.google',
													  accessToken: accessToken,
													  refreshToken: refreshToken,
													  profileId: parsed.id }, true);
			});
		}
	}),

    _init: function(engine, state) {
        this.parent(engine, state);

        // NOTE: for legacy reasons, this is google-account-*, not com.google-* as one would
        // hope
        // please do not follow this example
        this.uniqueId = 'google-drive-' + this.profileId;
        this.name = "Google Drive Account %s".format(this.profileId);
        this.description = "This is your Google Drive Account. You can use it to access and manage files on Google Drive.";
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

