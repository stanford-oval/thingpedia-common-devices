// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

module.exports = new Tp.DeviceClass({
    Name: 'GoogleAccountDevice',
    UseOAuth2: Tp.Helpers.OAuth2({
		kind: 'com.google',
		client_id: '739906609557-o52ck15e1ge7deb8l0e80q92mpua1p55.apps.googleusercontent.com',
		client_secret: 'drAqNZnVS_9jHl6KBENOPVXR',
		scope: ['openid','profile','email',
                'https://mail.google.com/',
                'https://www.googleapis.com/auth/plus.me',
                'https://www.googleapis.com/auth/drive',
                'https://www.googleapis.com/auth/drive.appdata',
                'https://www.googleapis.com/auth/drive.file'],
		authorize: 'https://accounts.google.com/o/oauth2/auth',
		get_access_token: 'https://www.googleapis.com/oauth2/v3/token',
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
        this.uniqueId = 'google-account-' + this.profileId;
        this.name = "Google Account %s".format(this.profileId);
        this.description = "This is your Google Account. You can use it to access emails, files, calendars and more.";
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

