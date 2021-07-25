// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2019 Giovanni Campagna <gcampagn@cs.stanford.edu>,Silei Xu <silei@cs.stanford.edu>
// Copyright 2021 The Board of Trustees of the Leland Stanford Junior University
//
// See LICENSE for details
"use strict";

const assert = require('assert');
const Tp = require('thingpedia');

const MOON_PHASE = 'new_moon,waxing_crescent,first_quarter,waxing_gibbous,full_moon,waning_gibbous,third_quarter,waning_crescent'.split(',');
const WEATHER_STATUS = 'raining,cloudy,sunny,snowy,sleety,drizzling,windy,foggy'.split(',');

module.exports = [
    ['query', 'sunrise', { location: { x: -120, y: 37 }, date: new Date() }, (result) => {
        assert(result[0].sunrise_time instanceof Tp.Value.Time);
        assert(result[0].sunset_time instanceof Tp.Value.Time);
        assert(typeof result[0].sunset === 'boolean');
        assert(typeof result[0].sunrisen === 'boolean');
    }],

    ['query', 'moon', { location: { x: -120, y: 37 }, date: new Date() }, (result) => {
        assert(MOON_PHASE.includes(result[0].phase));
    }],

    ['query', 'current', { location: { x: -120, y: 37 } }, (result) => {
        result.forEach((r) => {
            assert(typeof r.temperature === 'number');
            assert(typeof r.wind_speed === 'number');
            assert(typeof r.fog === 'number');
            assert(typeof r.humidity === 'number');
            assert(typeof r.cloudiness === 'number');
            assert(WEATHER_STATUS.includes(r.status), `Invalid weather status ${r.status}`);
        });
    }],

    /* FIXME: add back the weather forecast
    ['query', 'forecast', { location: { x: -120, y: 37 } }, (result) => {
        result.forEach((r) => {
            assert(r.date instanceof Date);
            assert(typeof r.temperature === 'number');
            assert(typeof r.wind_speed === 'number');
            assert(typeof r.fog === 'number');
            assert(typeof r.humidity === 'number');
            assert(typeof r.cloudiness === 'number');
            assert(WEATHER_STATUS.includes(r.status));
        });
    }]*/
];
