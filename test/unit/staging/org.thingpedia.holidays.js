// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2019 Giovanni Campagna <gcampagn@cs.stanford.edu>,Silei Xu <silei@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const assert = require('assert');

module.exports = [
    ['query', 'get_holidays', {}, (results) => {
        for (let result of results) {
            assert(result.date instanceof Date);
            assert(typeof result.summary === 'string');
            assert(typeof result.description === 'string');
        }
    }],

    ['query', 'get_holidays', { country: 'it' }, (results) => {
        for (let result of results) {
            assert(result.date instanceof Date);
            assert(typeof result.summary === 'string');
            assert(typeof result.description === 'string');
        }
    }],

    ['query', 'get_holidays', { country: 'uk' }, (results) => {
        for (let result of results) {
            assert(result.date instanceof Date);
            assert(typeof result.summary === 'string');
            assert(typeof result.description === 'string');
        }
    }],
];
