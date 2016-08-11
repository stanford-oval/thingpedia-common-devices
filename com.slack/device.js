// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Luke Hsiao & Jeff Setter

const Tp = require('thingpedia');

module.exports = new Tp.DeviceClass({
    Name: 'Slack',
    UseOAuth2: Tp.Helpers.OAuth2({
      kind: 'com.slack',
      client_id: '48257630786.66509414198',
      client_secret: 's6s5626q15pq72p4pqrro89q5o560o1n',
      scope: ['chat:write:user', 'chat:write:bot', 'files:write:user',
        'channels:read', 'channels:history', 'users:read', 'users:write',
        'channels:write'
      ],
      authorize: 'https://slack.com/oauth/authorize',
      get_access_token: 'https://slack.com/api/oauth.access',
      callback: function(engine, accessToken, refreshToken) {
          var auth = 'Bearer ' + accessToken;
          return Tp.Helpers.Http.post('https://slack.com/api/auth.test',
            'token=' + accessToken,
            { dataContentType: 'application/x-www-form-urlencoded' })
            .then(function(response) {
                var parsed = JSON.parse(response);

                return engine.devices.loadOneDevice({
                    kind: 'com.slack',
                    accessToken: accessToken,
                    team: parsed.team,
                    user: parsed.user,
                    user_id: parsed.user_id,
                    url: parsed.url,
                    team_id: parsed.team_id
                }, true);
            });
        }
    }),

    _init: function(engine, state) {
        this.parent(engine, state);

        this.uniqueId = 'com.slack-' + this.state.user_id;
        this.name = "Slack %s".format(this.state.user_id);
        this.description = "This is Slack owned by %s"
            .format(this.state.user);
    },

    get userId() {
        return this.state.user_id;
    },

    get userName() {
        return this.state.user;
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
            // fallthrough
        default:
            return null;
        }
    },

    refreshCredentials: function() {
        // FINISHME refresh the access token using the refresh token
    },
});
