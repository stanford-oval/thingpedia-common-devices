// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2021 The Board of Trustees of the Leland Stanford Junior University
//
// See LICENSE for details
"use strict";

const assert = require('assert');
const Tp = require('thingpedia');

const S_HVAC_ACTION = 'heating,cooling,off,drying,idle'.split(',');
const S_HVAC_MODE = 'heat,cool,heat_cool,off,auto,dry,fan_only'.split(',');
const S_HVAC_PRESET = 'eco,away,boost,comfort,home,sleep,activity'.split(',');
const S_FAN_MODE = 'on,off,auto,low,medium,high,middle,focus,diffuse'.split(',');
const S_SWING_MODE = 'swing_off,swing_vertical,swing_horizontal,swing_both'.split(',');


module.exports = [
    ['query', 'hvac_action', {}, (result) => {
        assert(S_HVAC_ACTION.includes(result[0].action), `Invalid hvac action ${result[0].action}`);
    }],

    ['query', 'hvac_modes_aval', {}, (result) => {
        assert(S_HVAC_MODE.includes(result[0].modes), `Invalid hvac modes available ${result[0].modes}`);
    }],

    ['query', 'hvac_preset', {}, (result) => {
        assert(S_HVAC_PRESET.includes(result[0].preset), `Invalid hvac presets ${result[0].preset}`);
    }],

    ['query', 'hvac_presets_aval', {}, (result) => {
        assert(S_HVAC_PRESET.includes(result[0].presets), `Invalid hvac presets available ${result[0].presets}`);
    }],

    ['query', 'current_temperature', {}, (result) => {
        assert(typeof result[0].value === 'number');
    }],

    ['query', 'target_temperature', {}, (result) => {
        assert(typeof result[0].value === 'number');
    }],

    ['query', 'min_temperature', {}, (result) => {
        assert(typeof result[0].low === 'number');
    }],

    ['query', 'max_temperature', {}, (result) => {
        assert(typeof result[0].high === 'number');
    }],

    ['query', 'current_humidity', {}, (result) => {
        assert(typeof result[0].value === 'number');
    }],

    ['query', 'target_humidity', {}, (result) => {
        assert(typeof result[0].value === 'number');
    }],

    ['query', 'min_humidity', {}, (result) => {
        assert(typeof result[0].low === 'number');
    }],

    ['query', 'max_humidity', {}, (result) => {
        assert(typeof result[0].high === 'number');
    }],

    ['query', 'fan_mode', {}, (result) => {
        assert(S_FAN_MODE.includes(result[0].mode), `Invalid fan mode ${result[0].mode}`);
    }],

    ['query', 'fan_modes_aval', {}, (result) => {
        assert(S_FAN_MODE.includes(result[0].modes), `Invalid fan modes available ${result[0].modes}`);
    }],

    ['query', 'swing_mode', {}, (result) => {
        assert(S_SWING_MODE.includes(result[0].mode), `Invalid swing mode ${result[0].mode}`);
    }],

    ['query', 'swing_modes_aval', {}, (result) => {
        assert(S_SWING_MODE.includes(result[0].modes), `Invalid swing modes available ${result[0].modes}`);
    }]
];