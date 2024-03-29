// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2019-2020 The Board of Trustees of the Leland Stanford Junior University
//
// Redistribution and use in source and binary forms, with or
// without modification, are permitted provided that the following
// conditions are met:
//
// 1. Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above
//    copyright notice, this list of conditions and the following
//    disclaimer in the documentation and/or other materials
//    provided with the distribution.
// 3. Neither the name of the copyright holder nor the names of its
//    contributors may be used to endorse or promote products derived
//    from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
// INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
// SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
// HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
// STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED
// OF THE POSSIBILITY OF SUCH DAMAGE.
//
// Author: Silei Xu <silei@cs.stanford.edu>
"use strict";

const Redis = require("redis");
const Tp = require('thingpedia');
const TT = require('thingtalk');
const Logging = require("@stanford-oval/logging");
const Winston = require("winston");
const { Temporal } = require('@js-temporal/polyfill');

const LogFactory = new Logging.Factory({
    runRoot: __dirname,
    level: "http",
    envVarPrefix: "TP_YELP_LOG",
    transports: [
        new Winston.transports.Console({
            format: Logging.Format.prettySimple({ colorize: true }),
        }),
    ],
});

const LOG = LogFactory.get(__filename);
const URL = "https://api.yelp.com/v3/businesses";
const CACHE_TTL_SECONDS = 60 * 60 * 24; // 1 day

const CUISINES = new Set(require('./cuisines.json').data.map((d) => d.value));

function prettyprintAddress(address) {
    if (address.display_address)
        return address.display_address.join(', ').replace(/\b\s*[0-9]{5}\b/, '').trim();

    return [
        address.address1,
        address.address2,
        address.address3,
        address.city,
        address.country === 'US' ? address.state : address.country
    ].filter((i) => i.length > 0).join(', ');
}

const PRICE_RANGE_MAP = {
    $: 'cheap',
    $$: 'moderate',
    $$$: 'expensive',
    $$$$: 'luxury',
};
const INVERSE_PRICE_RANGE_MAP = {
    cheap: '1',
    moderate: '2',
    expensive: '3',
    luxury: '4'
};

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

function parseDate(date, timezone = Temporal.Now.timeZone().id) {
    const plainDate = Temporal.PlainDate.from(date);
    const temporal = Temporal.ZonedDateTime.from({ year: plainDate.year, month: plainDate.month, day: plainDate.day, hour:0, minute:0, second:0, timeZone: timezone });
    return new Date(temporal.epochMilliseconds);
}

function dateAdd(date, ms) {
    return new Date(date.getTime() + ms);
}

function todayAt(time, timezone = Temporal.Now.timeZone().id) {
    return new Date(Temporal.Now.instant().toZonedDateTimeISO(timezone).withPlainTime(time).epochMilliseconds);
}

module.exports = class YelpDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);

        this.name = "Yelp";
        this.description = "Yelp search for Almond ";
        this.log = LOG.childFor(YelpDevice);
        this.redisClient = hasRedis() ? Redis.createClient({ url: getRedisURL() }) : null;
    }

    async start() {
        this.log.debug("Starting...");
        if (this.redisClient) await this.redisClient.connect();
        this.log.debug("Started.");
    }

    async _getCached(key) {
        if (!this.redisClient) return null;
        const log = this.log.childFor(this._getCached);
        const cached = await this.redisClient.GET(key);
        if (cached === null)
            log.info("CACHE MISS", { key });
        else
            log.info("CACHE HIT", { key });
        return cached;
    }

    async _setCached(key, data) {
        if (!this.redisClient) return;
        const log = this.log.childFor(this._getCached);
        log.info("CACHE SET", { key });
        await this.redisClient.SET(key, data, { EX: CACHE_TTL_SECONDS });
    }

    async _get(url) {
        const log = this.log.childFor(this._get);
        const profiler = log.startTimer();
        log.debug("Start GET request...", { url });

        let fromCache = false;
        const key = `com.yelp:${url}`;
        const cached = await this._getCached(key);
        let data;
        if (cached === null) {
            const httpProfiler = log.startTimer();
            data = await Tp.Helpers.Http.get(url, {
                auth: 'Bearer ' + this.constructor.metadata.auth.api_key
            });
            const httpLogInfo = {
                level: "http",
                message: "Yelp API request complete",
                url,
            };
            if (log.isLevelEnabled("debug")) httpLogInfo.data = data;
            httpProfiler.done(httpLogInfo);
            this._setCached(key, data);
        } else {
            fromCache = true;
            data = cached;
        }
        const response = JSON.parse(data);

        const logInfo = {
            level: "info",
            message: "Request complete",
            fromCache,
            url,
        };
        if (log.isLevelEnabled("debug")) logInfo.response = response;
        profiler.done(logInfo);

        return response;
    }

    _mapOpeningHours(hours, specialHours) {
        //console.log('_mapOpeningHours', hours, specialHours);
        return hours.flatMap((h) => h.open.map((h) => new TT.Builtin.RecurrentTimeRule({
            beginTime: new Tp.Value.Time(parseInt(h.start.slice(0, 2), 10), parseInt(h.start.slice(2, 4), 10)),
            endTime: new Tp.Value.Time(parseInt(h.end.slice(0, 2), 10), parseInt(h.end.slice(2, 4), 10)),
            dayOfWeek: h.day
        }))).concat((specialHours||[]).map((h) => new TT.Builtin.RecurrentTimeRule({
            beginTime: h.start ? new Tp.Value.Time(parseInt(h.start.slice(0, 2), 10), parseInt(h.start.slice(2, 4), 10)) : new Tp.Value.Time(0,0),
            endTime: h.end ? new Tp.Value.Time(parseInt(h.end.slice(0, 2), 10), parseInt(h.end.slice(2, 4), 10)) : new Tp.Value.Time(0,0,0),
            beginDate: parseDate(h.date, this.platform.timezone),
            endDate: dateAdd(parseDate(h.date, this.platform.timezone), 86400000),
            subtract: !!h.is_closed
        })));
    }

    async get_restaurant(params, hints, env) {
        let sortBy = 'best_match';
        let limit = 20;
        // NOTE sort by is not strict, so we cannot use the limit hint
        if (hints && hints.sort) {
            if (hints.sort[0] === 'reviewCount' && hints.sort[1] === 'desc')
                sortBy = 'review_count';
            else if (hints.sort[0] === 'rating' && hints.sort[1] === 'desc')
                sortBy = 'rating';
        }

        console.log(`need fields`, hints.projection);
        const needsBusinessDetails = hints.projection.includes('opening_hours');

        let url = `${URL}/search?limit=${limit}&sort_by=${sortBy}&locale=${this.platform.locale.replace('-', '_')}`;

        const query = {
            term: '',
            location: undefined,
            categories: '',
            price: undefined,
            open_at: undefined
        };
        const addedCategories = new Set;

        if (hints && hints.filter) {
            for (let [pname, op, value] of hints.filter) {
                if (pname === 'id' && (op === '==' || op === '=~')) {
                    if (value instanceof Tp.Value.Entity)
                        query.term += ' ' + value.display;
                    else
                        query.term += ' ' + value;
                } else if (pname === 'geo' && (op === '==' || op === '=~')) {
                    query.location = value;
                } else if (pname === 'distance' && op === 'geo') {
                    query.location = value;
                } else if (pname === 'cuisines' && op === 'contains') {
                    if (addedCategories.has(String(value)))
                        continue;
                    addedCategories.add(String(value));
                    if (query.categories)
                        query.categories += ',' + value;
                    else
                        query.categories = value;
                } else if (pname === 'price' && op === '==') {
                    query.price = INVERSE_PRICE_RANGE_MAP[String(value)];
                } else if (pname === 'opening_hours' && op === 'contains') {
                    const date = (value instanceof Tp.Value.Time ? todayAt(value, this.platform.timezone) : value);
                    query.open_at = Math.round(date.getTime()/1000);
                }
            }
        }
        if (!query.categories)
            query.categories = 'restaurants';
        if (!query.location) {
            const gps = this.platform.getCapability('gps');
            if (gps)
                query.location = await gps.getCurrentLocation();
            if (!query.location)
                query.location = { display: 'palo alto' };
        }
        if (query.location.lat && query.location.lat)
            url += `&latitude=${query.location.lat}&longitude=${query.location.lon}`;
        else
            url += `&location=${encodeURIComponent(query.location.display)}`;
        if (query.term)
            url += `&term=${encodeURIComponent(query.term.trim())}`;
        if (query.categories)
            url += `&categories=${query.categories}`;
        if (query.price)
            url += `&price=${query.price}`;
        if (query.open_at)
            url += `&open_at=${query.open_at}`;
        /*if (params.radius)
            url += `&radius=${params.radius.value}`;
        */

        console.log(url);

        try {
            const parsed = await this._get(url);
            return await Promise.all(parsed.businesses.filter((b) => !b.is_closed).map(async (b) => {
                const id = new Tp.Value.Entity(b.id, b.name);
                const cuisines = b.categories.filter((cat) => CUISINES.has(cat.alias))
                    .map((cat) => new Tp.Value.Entity(cat.alias, cat.alias === 'creperies' ? "Crepes" : cat.title));

                const geo = new Tp.Value.Location(b.coordinates.latitude, b.coordinates.longitude,
                    prettyprintAddress(b.location));

                const data = {
                    id,
                    image_url: b.image_url,
                    link: b.url,
                    cuisines,
                    price: b.price ? (PRICE_RANGE_MAP[b.price] || /* convert weird currency symbols to $*/ PRICE_RANGE_MAP['$'.repeat(b.price.length)]) : undefined,
                    rating: Number(b.rating),
                    review_count: b.review_count,
                    geo,
                    phone: b.phone || undefined,
                };
                if (!needsBusinessDetails)
                    return data;

                try {
                    const details = await this._get(`https://api.yelp.com/v3/businesses/${b.id}`);
                    data.opening_hours = this._mapOpeningHours(details.hours, details.special_hours);
                } catch(e) {
                    console.error(`Failed to get opening hours for ${b.id} (${b.name}): ${e.message}`);
                }
                return data;
            }));
        } catch(e) {
            if (e.code === 500)
                e.code = 'unavailable';
            else if (typeof e.code === 'number')
                e.code = `http_${e.code}`;
            throw e;
        }
    }
};
