// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2021 cfan <wjruoxue@gmail.com>
//
// See LICENSE for details
"use strict";

const assert = require('assert');
const Tp = require('thingpedia');

module.exports = [
    ['query', 'appointment', { location: { x: -122.153461, y: 37.427776 }, distance: 10, dose: 'first', vaccine_type: 'moderna' }, (result) => {
        result.forEach((r) => {
            assert(typeof r.geo.display === 'string');
            assert(typeof r.link === 'string');
        });
    }],
];