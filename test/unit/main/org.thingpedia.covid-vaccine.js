// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2021 cfan <wjruoxue@gmail.com>
//
// See LICENSE for details
"use strict";

const assert = require('assert');
const Tp = require('thingpedia')

module.exports = [
    ['query', 'appointment', { location: { x: -122.153461, y: 37.427776 } }, (result) => {
        result.forEach((r) => {
            assert(typeof r.name === 'string');
            assert(typeof r.address === 'string');
            assert(typeof r.city === 'string');
            assert(typeof r.state === 'string');
            assert(typeof r.postal_code === 'string');
            assert(typeof r.url === 'string');
        });
        console.log(result)
    }],
];
