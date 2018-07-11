// Copyright 2017 Rakesh Ramesh <rakeshr@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

function getDateString(date) {
    return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
}

module.exports = class FitbitDevice extends Tp.BaseDevice {
    static get runOAuth2() {
        return Tp.Helpers.OAuth2({
            kind: 'com.fitbit',
            scope: ['activity', 'heartrate', 'location','nutrition','profile','settings','sleep','social', 'weight'],
            authorize: 'https://www.fitbit.com/oauth2/authorize',
            get_access_token: 'https://api.fitbit.com/oauth2/token',
            use_basic_client_auth: true,

            redirect_uri: 'https://thingengine.stanford.edu/devices/oauth2/callback/' + 'com.fitbit',
            callback: function(engine, accessToken, refreshToken) {
                let auth = 'Bearer ' + accessToken;
                console.log('accessToken', accessToken);
                return Tp.Helpers.Http.get('https://api.fitbit.com/1/user/-/profile.json',
                    { auth: auth })
                    .then(function(response) {
                        let parsed = JSON.parse(response);
                        console.log('parsed', parsed);
                        return engine.devices.loadOneDevice({
                            kind: 'com.fitbit',
                            accessToken: accessToken,
                            refreshToken: refreshToken,
                            userId: parsed.user.encodedId,
                            userName: parsed.user.fullName
                        }, true);
                    });
            }
        });
    }

    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'com.fitbit-' + this.userId;

        this.name = "Fitbit %s".format(this.userName);
        this.description = "This is a Fitbit owned by %s"
            .format(this.userName);
    }

    get userId() {
        return this.state.userId;
    }

    get userName() {
        return this.state.userName;
    }

    get accessToken() {
        return this.state.accessToken;
    }

    get refreshToken() {
        return this.state.refreshToken;
    }

    _getMeasureValue(measurement) {
        const options = {
            useOAuth2: this,
            accept: 'application/json'
        };
        const resourceURL = `https://api.fitbit.com/1/user/${this.userId}/body/${measurement}/date/today/1d.json`;
        return Tp.Helpers.Http.get(resourceURL, options).then(function (response) {
            try {
                const parsed = JSON.parse(response);
                console.log(parsed);
                let field = 'body-' + measurement;
                if(parsed[field].length === 0)
                    throw new Error("No record found");
                return parsed[field][0].value;
            } catch (e) {
                console.log('Error parsing Fitbit server response: ' + e.message);
                console.log('Full response was');
                console.log(response);
                throw new Error("Failed to get valid result from Fitbit");
            }
        });
    }

    get_getbody({}) {
        return Promise.all([this._getMeasureValue('weight'), this._getMeasureValue('bmi'), this._getMeasureValue('fat')])
            .then(([weight, bmi, fat]) => {
                return [{
                    weight: parseFloat(weight),
                    bmi: parseFloat(bmi),
                    fat: parseFloat(fat)
                }];
            });
    }

    get_getsteps( { date }) {
        if(date === undefined) {
            date = new Date(Date.now());
        }

        const getUrl = `https://api.fitbit.com/1/user/${this.userId}/activities/date/${getDateString(date)}.json`;
        return Tp.Helpers.Http.get(getUrl, { useOAuth2: this, accept: 'application/json'}).then(function(response) {
            try {
                let parsed = JSON.parse(response);
                console.log(parsed);
                let steps = parsed.summary.steps;
                return [{ date, steps }];
            } catch(e) {
                console.error("Got error parsing response: " + e);
                throw new Error("Failed to get valid result from Fitbit");
            }
        });
    }


    do_recordweight({ weight }) {
        console.log('Weight logged : ' + weight);
        const headers = {
            useOAuth2: this,
            dataContentType: 'application/json',
            accept: 'application/json'
        };
        const postUrl = `https://api.fitbit.com/1/user/${this.userId}/body/log/weight.json?weight=${weight}&date=${getDateString(new Date())}`;
        return Tp.Helpers.Http.post(postUrl, '', headers).catch(function(error) {
            throw new Error('Error posting on Fitbit: ' + error.message);
        });
    }
};
