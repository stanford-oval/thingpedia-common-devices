// Copyright 2017 Rakesh Ramesh <rakeshr@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

const DEVICE_ID = 'edu.stanford.rakeshr1.fitbit';
module.exports = new Tp.DeviceClass({
    Name: "FitbitDevice",
    Kinds: ['activity-tracker','fitness-tracker','sleep-tracker',
        'heartrate-monitor'],

    UseOAuth2: Tp.Helpers.OAuth2({
        kind: DEVICE_ID,
        scope: ['activity', 'heartrate', 'location','nutrition','profile','settings','sleep','social', 'weight'],
        authorize: 'https://www.fitbit.com/oauth2/authorize',
        get_access_token: 'https://api.fitbit.com/oauth2/token',
        use_basic_client_auth: true,

        redirect_uri: 'https://thingengine.stanford.edu/devices/oauth2/callback/' + DEVICE_ID,
        callback: function(engine, accessToken, refreshToken) {
            var auth = 'Bearer ' + accessToken;
            console.log('accessToken', accessToken);
            return Tp.Helpers.Http.get('https://api.fitbit.com/1/user/-/profile.json',
                    { auth: auth })
                .then(function(response) {
                    var parsed = JSON.parse(response);
                    console.log('parsed', parsed);
                    return engine.devices.loadOneDevice({
                        kind: DEVICE_ID,
                        accessToken: accessToken,
                        refreshToken: refreshToken,
                        userId: parsed.user.encodedId,
                        userName: parsed.user.fullName
                    }, true);
                });
        }
    }),


    _init: function(engine, state) {
        this.parent(engine, state);
        this.uniqueId = DEVICE_ID + '-' + this.userId;

        this.name = "Fitbit %s".format(this.userName);
        this.description = "This is a Fitbit owned by %s"
            .format(this.userName);
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
        console.log(this.constructor.metadata.client_id);
        console.log(this.constructor.metadata.client_secret);
        return Tp.Helpers.Http.post('https://api.fitbit.com/oauth2/token',
            {
                auth: 'Basic ' + Buffer.from(this.constructor.metadata.client_id + ':' + this.constructor.metadata.client_secret).toString('base64'),
                grant_type: 'refresh_token',
                refresh_token: this.refreshToken
            }).then(function(response) {
                var parsed = JSON.parse(response);
                console.log('parsed', parsed);
                this.state.accessToken = parsed.access_token;
                this.state.refreshToken = parsed.refresh_token;
                return this.accessToken;
            });
    }
});