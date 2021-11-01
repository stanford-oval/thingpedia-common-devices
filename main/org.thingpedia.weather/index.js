// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//                Silei Xu <silei@cs.stanford.edu>
//                Andrei Bajenov <abajenov@stanford.edu>
//                Darshan Kapashi <darshank@stanford.edu>
//
// See LICENSE for details
"use strict";

const Redis = require("redis");
const Tp = require('thingpedia');
const Logging = require("@stanford-oval/logging");
const Winston = require("winston");

const LogFactory = new Logging.Factory({
    runRoot: __dirname,
    level: "http",
    envVarPrefix: "TP_WEATHER_LOG",
    transports: [
        new Winston.transports.Console({
            format: Logging.Format.prettySimple({ colorize: true }),
        }),
    ],
});

const LOG = LogFactory.get(__filename);

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;

const SUNRISE_URL = 'https://api.met.no/weatherapi/sunrise/2.0/?lat=%f&lon=%f&date=%04d-%02d-%02d&offset=-00:00';
const WEATHER_URL = 'https://api.met.no/weatherapi/locationforecast/2.0/classic?lat=%f;lon=%f';


function dateDiff(date1, date2) {
    // Discard the time and time-zone information.
    const utc1 = Date.UTC(date1.getFullYear(), date1.getMonth(), date1.getDate());
    const utc2 = Date.UTC(date2.getFullYear(), date2.getMonth(), date2.getDate());
    return Math.floor((utc2 - utc1) / MS_PER_DAY);
}

class ForecastError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}

function hasRedis() {
    return (
        typeof process.env.REDIS_HOST === "string"
        && process.env.REDIS_HOST.length > 0
    );
}

function getRedisURL() {
    let url = "redis://";
    if (process.env.REDIS_USER !== null) {
        url += process.env.REDIS_USER;
        if (process.env.REDIS_PASSWORD !== null)
            url += `:${process.env.REDIS_PASSWORD}`;
        url += "@";
    }
    url += process.env.REDIS_HOST;
    return url;
}

module.exports = class WeatherAPIDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);
        this.redisClient = hasRedis() ? Redis.createClient({url: getRedisURL()}) : undefined;
    }

    async start() {
        LOG.debug("Starting...");
        if (this.redisClient) await this.redisClient.connect();
        LOG.debug("Started.");
    }

    async _getCached(key) {
        if (!this.redisClient) return null;
        const cached = await this.redisClient.GET(key);
        if (cached === null)
            LOG.info("CACHE MISS", {key});
        else
            LOG.info("CACHE HIT", {key});
        return cached;
    }

    async _setCached(key, data) {
        if (!this.redisClient) return;
        LOG.info("CACHE SET", {key});
        await this.redisClient.SET(key, data, {EX: 30 * 60});
    }

    async _get(url) {
        const key = `org.thingpedia.weather:${url}`;
        const cached = await this._getCached(key);
        let xml;
        if (cached === null) {
            xml = await Tp.Helpers.Http.get(url);
            await this._setCached(key, xml);
        } else {
            xml = cached;
        }
        return await Tp.Helpers.Xml.parseString(xml);
    }

    async _sunrise_data(location, date) {
        const url = SUNRISE_URL.format(location.y, location.x, date.getFullYear(), date.getMonth()+1, date.getDate());
        console.log('Loading sunrise data from ' + url);
        const parsed = await this._get(url);
        return parsed.astrodata.location[0].time[0];
    }

    async _weather_data(location) {
        const url = WEATHER_URL.format(location.y, location.x);
        console.log('Loading weather data from ' + url);
        const parsed = await this._get(url);
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

    async get_forecast({ date, location }) {
        const data = await this._weather_data(location);
        const now = new Date(data[0].$.from);
        const today = new Date(now);
        today.setHours(0, 0, 0);
        // do forecast for tomorrow if time is unspecified
        if (!date)
            date = new Date(today + 86400 * 1000);

        if (date < now)
            throw new ForecastError('no_past_forecast', `Invalid date ${date}: is in the past`);

        // find the weather closest to the time the user asked for

        // if the time is midnight (ie the user specified a date without a time), we do 2pm,
        // which is usually the hottest time of the day
        //
        // FIXME: we should do 2pm local-time of the location we're asking the weather for,
        // but that's a bit difficult so we just 2pm local-time to the server
        // (which is 2pm pacific for cloud, and 2pm local-time to the user for server/gnome)

        let comparetime = new Date(date.getTime());
        if (comparetime.getHours() === 0 && comparetime.getMinutes() === 0 &&
            comparetime.getSeconds() === 0)
            comparetime.setHours(14, 0, 0);

        let best = undefined, bestdelta = undefined;
        for (let i = 0; i < data.length; i++) {
            if (data[i].$.from !== data[i].$.to)
                continue;
            const datetime = new Date(data[i].$.from);

            // never select a forecast for the wrong day
            if (datetime.getDate() !== comparetime.getDate() ||
                datetime.getMonth() !== comparetime.getMonth() ||
                datetime.getFullYear() !== comparetime.getFullYear())
                continue;

            let delta = Math.abs(datetime - comparetime);
            if (bestdelta === undefined || delta < bestdelta) {
                best = await this._extract_weather(data[i], data[i+1]);
                best.date = datetime;
                bestdelta = delta;
            }
        }
        if (!best)
            throw new ForecastError('not_available', `Forecast for ${date} not available yet`);

        return [best];
    }
};
