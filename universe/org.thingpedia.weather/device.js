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

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

const SUNRISE_URL = 'https://api.met.no/weatherapi/sunrise/2.0/?lat=%f&lon=%f&date=%04d-%02d-%02d&offset=-00:00';
const WEATHER_URL = 'https://api.met.no/weatherapi/locationforecast/1.9/?lat=%f;lon=%f';


function dateDiff(date1, date2) {
    // Discard the time and time-zone information.
    const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
    return Math.floor((utc2 - utc1) / MS_PER_DAY);
}

module.exports = class WeatherAPIDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);

        this.name = "Weather";
        this.description = "Weather forecasts and information provided by met.no";
        this.uniqueId = 'org.thingpedia.weather';
    }

    async _sunrise_data(location, date) {
        const url = SUNRISE_URL.format(location.y, location.x, date.getFullYear(), date.getMonth()+1, date.getDate());
        console.log('Loading sunrise data from ' + url);
        const parsed = await Tp.Helpers.Http.get(url).then(Tp.Helpers.Xml.parseString);
        return parsed.astrodata.location[0].time[0];
    }

    async _weather_data(location) {
        const url = WEATHER_URL.format(location.y, location.x);
        console.log('Loading weather data from ' + url);
        const parsed = await Tp.Helpers.Http.get(url).then(Tp.Helpers.Xml.parseString);
        return parsed.weatherdata.product[0].time;
    }

    // the weather details is stored in the entry where time $.from === $.to
    // however it contains no status information, which is available in the following entries
    // (which have the same $.to, but different $.from)
    // this function takes the entry with $.from === $.to for details, and one following entry for status info
    async _extract_weather(entry1, entry2) {
        const details = entry1.location[0];
        const weather_id = parseInt(entry2.location[0].symbol[0].$.number);

        // although symbol comes with a string, we still map it to a fixed set to simply natural language
        // for example, "a cloudy day" can be LightCloud/PartlyCloud/Cloud in status
        // for the full list of status, see: https://api.met.no/weatherapi/weathericon/1.1/documentation
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

        return {
            temperature: parseFloat(details.temperature ? details.temperature[0].$.value : 0),
            wind_speed: parseFloat(details.windSpeed ? details.windSpeed[0].$.mps || 0 : 0),
            humidity: parseFloat(details.humidity ? details.humidity[0].$.value || 0 : 0),
            cloudiness: parseFloat(details.cloudiness ? details.cloudiness[0].$.percent || 0 : 0),
            fog: parseFloat(details.fog ? details.fog[0].$.percent || 0 : 0),
            status,
            icon: `http://api.met.no/weatherapi/weathericon/1.1/?symbol=${weather_id};content_type=image/png`
        };
    }

    async get_sunrise({ location, date }) {
        if (date === undefined || date === null)
            date = new Date();
        const data = await this._sunrise_data(location, date);

        // the api might return sunset/sunrise time from the previous day
        // we will need to convert to the same date first before comparison
        // note that, using date.setDate(date.getDate() + 1) might cause problems due to daylight savings
        // so we use millisecond instead.
        let rise = new Date(data.sunrise[0].$.time);
        if (rise.getDate() !== date.getDate())
            rise = new Date(rise.getTime() + (dateDiff(rise, date) * MS_PER_DAY));
        let set = new Date(data.sunset[0].$.time);
        if (set.getDate() !== date.getDate())
            set = new Date(set.getTime() + (dateDiff(set, date) * MS_PER_DAY));

        const now = new Date();
        return [{
            location,
            date,
            sunrise_time: new Tp.Value.Time(rise.getHours(), rise.getMinutes(), rise.getSeconds()),
            sunset_time: new Tp.Value.Time(set.getHours(), set.getMinutes(), set.getSeconds()),
            sunrisen: now > rise,
            sunset: now > set
        }];
    }

    async get_moon({ location, date }) {
        if (date === undefined || date === null)
            date = new Date();
        const data = await this._sunrise_data(location, date);
        const phase = /(?:\()([a-z ]*)(?:\))/g.exec(data.moonphase[0].$.desc)[1].replace(/ /g, '_');
        return [{ location, date, phase }];
    }

    async get_current({ location }) {
        const data = await this._weather_data(location);
        const current = await this._extract_weather(data[0], data[1]);

        current.location = location;
        return [ current ];
    }

    async get_forecast({ location }) {
        const data = await this._weather_data(location);
        const forecasts = [];
        const now = new Date(data[0].$.from);
        const added = new Set();
        for (let i = 0; i < data.length; i++) {
            if (data[i].$.from !== data[i].$.to)
                continue;
            const datetime = new Date(data[i].$.from);
            if (datetime.getDate() === now.getDate()) {
                // same day forecast
                // return forecast every 6 hours
                if ((datetime - now) < 6 * MS_PER_HOUR)
                    continue;
                if ((datetime - now) % (6 * MS_PER_HOUR) !== 0)
                    continue;
                let forecast = await this._extract_weather(data[i], data[i+1]);
                forecast.location = location;
                forecast.date = datetime;
                forecasts.push(forecast);
            } else {
                // forecast for tomorrow and later
                // only return one forecast for each date
                if (added.has(datetime.getDate()))
                    continue;
                // store the first UTC time that is later than 9 AM in local time
                if (datetime.getHours() >= 9) {
                    added.add(datetime.getDate());
                    let forecast = await this._extract_weather(data[i], data[i+1]);
                    forecast.location = location;
                    forecast.date = datetime;
                    forecasts.push(forecast);
                }
            }
        }
        return forecasts;
    }
};
