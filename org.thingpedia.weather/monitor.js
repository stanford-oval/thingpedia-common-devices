// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//                Silei Xu <silei@cs.stanford.edu>
//                Andrei Bajenov <abajenov@stanford.edu>
//                Darshan Kapashi <darshank@stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');
const GetWeather = require('./weather_names');

const URL = 'https://api.met.no/weatherapi/locationforecast/1.9/?lat=%f;lon=%f';
const POLL_INTERVAL = 10 * 60 * 1000; // 10min

// for compatibility with older ThingTalk
const DEFAULT_FORMATTER = {
    locationToString(o) {
        return '[Latitude: ' + Number(o.y).toFixed(3) + ' deg, Longitude: ' + Number(o.x).toFixed(3) + ' deg]';
    }
};

module.exports = new Tp.ChannelClass({
    Name: 'WeatherAPICurrentWeather',
    Extends: Tp.HttpPollingTrigger,

    _init: function(engine, device, params) {
        this.parent();
        this._params = params;
        this._location = params[0];
        this.filterString = this._params.join('-');

        if (!this._location)
            throw new TypeError('Missing required parameter');
        this.interval = POLL_INTERVAL;
        this.url = URL.format(this._location.y, this._location.x);
    },

    formatEvent(event, hint, formatter) {
        var location = event[0];
        var temperature = event[1];
        var windSpeed = event[2];
        var humidity = event[3];
        var cloudiness = event[4];
        var fog = event[5];
        var weather = event[6];

        if (!formatter)
            formatter = DEFAULT_FORMATTER;

        if (hint === 'string-title')
            return "Current weather for %s".format(formatter.locationToString(event[0]));
        else if (hint === 'string-body')
            return "%s, temperature %.1f C, wind speed %.1f m/s, humidity %.0f%%, cloudiness %.0f%%, fog %.0f%%"
                .format(weather, temperature, windSpeed, humidity, cloudiness, fog);
        else
            return "Current weather for %s: %s, temperature %.1f C, wind speed %.1f m/s, humidity %.0f%%, cloudiness %.0f%%, fog %.0f%%"
                .format(formatter.locationToString(event[0]), weather, temperature, windSpeed, humidity, cloudiness, fog);
    },

    _onResponse(response) {
        if (!response)
            return;

        self = this;
        return Tp.Helpers.Xml.parseString(response).then((parsed) => {
            var entry = parsed.weatherdata.product[0].time[0].location[0];
            var temperature = parseFloat(entry.temperature[0].$.value);
            var windSpeed = parseFloat(entry.windSpeed[0].$.mps);
            var humidity = parseFloat(entry.humidity[0].$.value);
            var cloudiness = parseFloat(entry.cloudiness[0].$.percent);
            var fog = parseFloat(entry.fog[0].$.percent);
            var weather_id = parseInt(parsed.weatherdata.product[0].time[1].location[0].symbol[0].$.number);
            var weather = GetWeather(weather_id);
            
            var status;
            if (weather_id = 1) 
                status = 'sunny';
            else if (weather_id = 15)
                status = 'foggy';
            else if (weather_id in [2, 3, 4])
                status = 'cloudy';
            else if (weather_id in [5, 6, 9, 10, 11, 22, 41]) 
                status = 'raining';
            else if (weather_id in [24, 30, 40, 46])
                status = 'drizzling';
            else if (weather_id in [8, 13, 14, 21, 28, 29, 33, 34, 44, 45, 49, 50])
                status = 'snowy';
            else if (weather_id in [7, 12, 20, 23, 26, 27, 31, 32, 42, 43, 47, 48])
                status = 'sleety';

            if (isNaN(temperature)) {
                return;
            }
            // Set some defaults
            if (isNaN(windSpeed)) windSpeed = 0;
            if (isNaN(humidity)) humidity = 0;
            if (isNaN(cloudiness)) cloudiness = 0;
            if (isNaN(fog)) fog = 0;

            self.emitEvent([this._location, temperature, windSpeed, humidity, cloudiness, fog, weather, status]);
        });
    },

});

