// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2021 The Board of Trustees of the Leland Stanford Junior University
//
// See LICENSE for details
"use strict";

const assert = require('assert');
const Tp = require('thingpedia');

const S_STATE = 'on,off'.split(',');
const S_OSCILLATION = 'oscillating,not_oscillating'.split(',');

module.exports = [
    ['query', 'state', {}, (result) => {
        assert(S_STATE.includes(result[0].state), `Invalid fan status ${result[0].state}`);
    }],

    ['query', 'oscillation', {}, (result) => {
        assert(S_OSCILLATION.includes(result[0].state), `Invalid fan oscillating status ${result[0].state}`);
    }]
];