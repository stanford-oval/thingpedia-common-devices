// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//                Andrei Bajenov <abajenov@stanford.edu>
//                Darshan Kapashi <darshank@stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

const URL = 'https://api.met.no/weatherapi/locationforecast/1.9/?lat=%f;lon=%f';

// for compatibility with older ThingTalk
const DEFAULT_FORMATTER = {
    locationToString(o) {
        return '[Latitude: ' + Number(o.y).toFixed(3) + ' deg, Longitude: ' + Number(o.x).toFixed(3) + ' deg]';
    }
}

module.exports = new Tp.ChannelClass({
    Name: 'WeatherAPICurrentWeather',

    formatEvent(event, filters, hint, formatter) {
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

    invokeQuery(filters) {
        var location = filters[0];
        if (!location)
            throw new TypeError('Missing required parameter');

        var url = URL.format(location.y, location.x);
        console.log('Loading weather from ' + url);

        return Tp.Helpers.Http.get(url).then((response) => {
            return Tp.Helpers.Xml.parseString(response);
        }).then((parsed) => {
            var entry = parsed.weatherdata.product[0].time[0].location[0];
            var temperature = parseFloat(entry.temperature[0].$.value);
            var windSpeed = parseFloat(entry.windSpeed[0].$.mps);
            var humidity = parseFloat(entry.humidity[0].$.value);
            var cloudiness = parseFloat(entry.cloudiness[0].$.percent);
            var fog = parseFloat(entry.fog[0].$.percent);
            var weather_id = parseInt(parsed.weatherdata.product[0].time[1].location[0].symbol[0].$.number);
            var weather = this._getWeather(weather_id);
            if (isNaN(temperature)) {
                // Didn't get rise or set info.
                return;
            }
            // Set some defaults
            if (isNaN(windSpeed)) windSpeed = 0;
            if (isNaN(humidity)) humidity = 0;
            if (isNaN(cloudiness)) cloudiness = 0;
            if (isNaN(fog)) fog = 0;

            return [[location, temperature, windSpeed, humidity, cloudiness, fog, weather]];
        });
    },

    _getWeather(weather_id) {
        switch(weather_id) {
            case 1: return "Sun";
            case 2: return "Light cloud";
            case 3: return "Partly cloud";
            case 4: return "Cloud";
            case 5: return "Light sunshower";
            case 6: return "Light sunshower with thunder";
            case 7: return "Sleet and sun";
            case 8: return "Snow and sun";
            case 9: return "Light rain";
            case 10: return "Rain";
            case 11: return "Rain with thunder";
            case 12: return "Sleet";
            case 13: return "Snow";
            case 14: return "Snow with thunder";
            case 15: return "Fog";

            case 20: return "Sleet with thunder and sun";
            case 21: return "Snow with thunder and sun";
            case 22: return "Light rain with thunder";
            case 23: return "Sleet with thunder";
            case 24: return "Drizzle with thunder and sun";
            case 25: return "Sunshower with thunder";
            case 26: return "Light sleet with thunder and sun";
            case 27: return "Heavy sleet with thunder and sun";
            case 28: return "Light snow with thunder and sun";
            case 29: return "Heavy snow with thunder and sun";
            case 30: return "Drizzle with thunder";
            case 31: return "Light sleet with thunder";
            case 32: return "Heavy sleet with thunder";
            case 33: return "Light snow with thunder";
            case 34: return "Heavy snow with thunder";

            case 40: return "Drizzle and sun";
            case 41: return "Rain and sun";
            case 42: return "Light sleet and sun";
            case 43: return "Heavy sleet and sun";
            case 44: return "Light snow and sun";
            case 45: return "Heavy snow and sun";
            case 46: return "Drizzle";
            case 47: return "Light sleet";
            case 48: return "Heavy sleet";
            case 49: return "Light snow";
            case 50: return "Heavy snow";

            default: return "Unknown";
        }

    }

});

