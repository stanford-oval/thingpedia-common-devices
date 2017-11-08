// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2017 Rakesh Ramesh <rakeshr@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

const BASE_URL = 'https://api.fitbit.com/1/user/%s/body/';

module.exports = new Tp.ChannelClass({
    Name: 'GetBodyFitbit',

    _init: function(engine, device, params) {
        this.parent();
        this.device = device;
        this.url = BASE_URL.format(this.device.userId);
        this.useOAuth2 = this.device;
    },

    formatEvent(event) {
        var eventString = 'Weight: %s kg, BMI: %s, Fat: %s%';
        return eventString.format(event[0], event[1].toFixed(2), event[2]);
    },

    _getMeasureValue: function(measurement) {
        var options = {
            useOAuth2: this.device,
            accept: 'application/json'
        };
        var resourceURL = this.url + '%s/date/today/1d.json';
        return Tp.Helpers.Http.get(resourceURL.format(measurement), options).then(function (response) {
            try {
                parsed = JSON.parse(response);
            } catch (e) {
                console.log('Error parsing Fitbit server response: ' + e.message);
                console.log('Full response was');
                console.log(response);
                return;
            }
            console.log(parsed);
            var field = 'body-' + measurement;
            if(parsed[field].length === 0)
                return;

            return parsed[field][0].value;
        });
    },

    invokeQuery: function(filters) {
        // Get recent weightlog
        return Promise.all([this._getMeasureValue('weight'), this._getMeasureValue('bmi'), this._getMeasureValue('fat')])
            .then(([weight, bmi, fat]) => {
                return [[parseFloat(weight), parseFloat(bmi), parseFloat(fat)]];
            });
    }
});

