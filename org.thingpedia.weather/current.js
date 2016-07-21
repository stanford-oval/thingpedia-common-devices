// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//                Andrei Bajenov <abajenov@stanford.edu>
//                Darshan Kapashi <darshank@stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

const URL = 'https://api.met.no/weatherapi/locationforecast/1.9/?lat=%f;lon=%f';

module.exports = new Tp.ChannelClass({
    Name: 'WeatherAPICurrentWeather',

    formatEvent(event) {
        var location = event[0];
        var temperature = event[1];
        var windSpeed = event[2];
        var humidity = event[3];
        var cloudiness = event[4];
        var fog = event[5];

        return "Current weather for [Location %.2f, %.2f]: temperature %.1f C, wind speed %.1f m/s, humidity %.0f%%, cloudiness %.0f%%, fog %.0f%%"
            .format(location.y, location.x, temperature, windSpeed, humidity, cloudiness, fog);
    },

    invokeQuery(filters) {
        var location = filters[0];
        if (!location)
            throw new TypeError('Missing required parameter');

        var url = URL.format(location.y, location.x);

        return Tp.Helpers.Http.get(url).then((response) => {
            return Tp.Helpers.Xml.parseString(response);
        }).then((parsed) => {
            var entry = parsed.weatherdata.product[0].time[0].location[0];
            var temperature = parseFloat(entry.temperature[0].$.value);
            var windSpeed = parseFloat(entry.windSpeed[0].$.mps);
            var humidity = parseFloat(entry.humidity[0].$.value);
            var cloudiness = parseFloat(entry.cloudiness[0].$.percent);
            var fog = parseFloat(entry.fog[0].$.percent);
            if (isNaN(temperature)) {
                // Didn't get rise or set info.
                return;
            }
            // Set some defaults
            if (isNaN(windSpeed)) windSpeed = 0;
            if (isNaN(humidity)) humidity = 0;
            if (isNaN(cloudiness)) cloudiness = 0;
            if (isNaN(fog)) fog = 0;

            return [[location, temperature, windSpeed, humidity, cloudiness, fog]];
        });
    },

});

