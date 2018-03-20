// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//                Silei Xu <silei@cs.stanford.edu>
//                Andrei Bajenov <abajenov@stanford.edu>
//                Darshan Kapashi <darshank@stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

const SUNRISE_URL = 'https://api.met.no/weatherapi/sunrise/1.1/?lat=%f;lon=%f;date=%04d-%02d-%02d';
const MOON_URL = 'https://api.met.no/weatherapi/sunrise/1.1/?lat=%f;lon=%f;date=%04d-%02d-%02d';
const WEATHER_URL = 'https://api.met.no/weatherapi/locationforecast/1.9/?lat=%f;lon=%f';

module.exports = class WeatherAPIDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);

        this.name = "Weather";
        this.description = "Weather forecasts and information provided by met.no";
        this.uniqueId = 'org.thingpedia.weather';
    }

    checkAvailable() {
        return Tp.Availability.AVAILABLE;
    }

    get_sunrise({ location, date }) {
        if (date === undefined || date === null)
            date = new Date;

        var url = SUNRISE_URL.format(location.y, location.x, date.getFullYear(), date.getMonth()+1, date.getDate());

        return Tp.Helpers.Http.get(url).then(Tp.Helpers.Xml.parseString).then((parsed) => {
            var sun = parsed.astrodata.time[0].location[0].sun[0];
            var rise = new Date(sun.$.rise);
            var set = new Date(sun.$.set);

            return [{
                location,
                date,
                sunrise_time: new Tp.Value.Time(rise.getHours(), rise.getMinutes(), rise.getSeconds()),
                sunset_time: new Tp.Value.Time(set.getHours(), set.getMinutes(), set.getSeconds())
            }];
        });
    }

    get_moon({ location, date }) {
        if (date === undefined || date === null)
            date = new Date;

        var url = MOON_URL.format(location.y, location.x, date.getFullYear(), date.getMonth()+1, date.getDate());

        return Tp.Helpers.Http.get(url).then((response) => {
            return Tp.Helpers.Xml.parseString(response);
        }).then((parsed) => {
            var moon = parsed.astrodata.time[0].location[0].moon[0];
            var phase = moon.$.phase.toLowerCase().replace(/ +/g, '_');

            return [{ location, date, phase }];
        });
    }

    get_current({ location }) {
        var url = WEATHER_URL.format(location.y, location.x);
        console.log('Loading weather from ' + url);

        return Tp.Helpers.Http.get(url).then(Tp.Helpers.Xml.parseString).then((parsed) => {
            const entry = parsed.weatherdata.product[0].time[0].location[0];
            const temperature = parseFloat(entry.temperature[0].$.value);
            const wind_speed = parseFloat(entry.windSpeed[0].$.mps) || 0;
            const humidity = parseFloat(entry.humidity[0].$.value) || 0;
            const cloudiness = parseFloat(entry.cloudiness[0].$.percent) || 0;
            const fog = parseFloat(entry.fog[0].$.percent) || 0;
            const weather_id = parseInt(parsed.weatherdata.product[0].time[1].location[0].symbol[0].$.number);

            let status;
            if (weather_id === 1)
                status = 'sunny';
            else if (weather_id === 15)
                status = 'foggy';
            else if ([2, 3, 4].indexOf(weather_id) >= 0)
                status = 'cloudy';
            else if ([5, 6, 9, 10, 11, 22, 41].indexOf(weather_id) >= 0)
                status = 'raining';
            else if ([24, 30, 40, 46].indexOf(weather_id) >= 0)
                status = 'drizzling';
            else if ([8, 13, 14, 21, 28, 29, 33, 34, 44, 45, 49, 50].indexOf(weather_id) >= 0)
                status = 'snowy';
            else if ([7, 12, 20, 23, 26, 27, 31, 32, 42, 43, 47, 48].indexOf(weather_id) >= 0)
                status = 'sleety';

            return [{
                location,
                temperature,
                wind_speed,
                humidity,
                cloudiness,
                fog,
                status,
                icon: `http://api.met.no/weatherapi/weathericon/1.1/?symbol=${weather_id};content_type=image/png`
            }];
        });
    }
};
