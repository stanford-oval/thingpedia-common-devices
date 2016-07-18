// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const Tp = require('thingpedia');

module.exports = new Tp.DeviceClass({
    Name: 'YouTubeDevice',
    UseOAuth2: Tp.Helpers.OAuth2({
		kind: 'com.youtube',
		client_id: '739906609557-o52ck15e1ge7deb8l0e80q92mpua1p55.apps.googleusercontent.com',
		client_secret: 'drAqNZnVS_9jHl6KBENOPVXR',
		scope: ['openid','profile','email',
                'https://www.googleapis.com/auth/youtube.force-ssl',
                'https://www.googleapis.com/auth/youtube',
                'https://www.googleapis.com/auth/youtube.readonly',
                'https://www.googleapis.com/auth/youtube.upload'],
		authorize: 'https://accounts.google.com/o/oauth2/auth',
		get_access_token: 'https://www.googleapis.com/oauth2/v3/token',
		callback: function(engine, accessToken, refreshToken) {
			var auth = 'Bearer ' + accessToken;
			return Tp.Helpers.Http.get('https://www.googleapis.com/oauth2/v2/userinfo', { auth: auth, accept: 'application/json' })
			.then(function(response) {
				var parsed = JSON.parse(response);
				return engine.devices.loadOneDevice({ kind: 'com.youtube',
													  accessToken: accessToken,
													  refreshToken: refreshToken,
													  userId: parsed.id,
													  userName: parsed.name }, true);
			});
		}
	}),

    _init: function(engine, state) {
        this.parent(engine, state);

        this.uniqueId = 'com.youtube-' + this.userId;
        this.name = "YouTube Account " + this.userName;
        this.description = "This is your YouTube Account. You can use it to search for videos, subscribe to channels or upload new videos.";
    },

    get userId() {
        return this.state.userId;
    },

    get userName() {
        return this.state.userName;
    },

    get accessToken() {
        return this.state.accessToken;
    }
});
