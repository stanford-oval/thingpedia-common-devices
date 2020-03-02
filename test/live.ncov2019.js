// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2020 Silei Xu <silei@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const assert = require('assert');
const Tp = require('thingpedia');

module.exports = [
    ['query', 'stats', {}, (results) => {
        for (let result of results) {
            assert(result.country instanceof Tp.Value.Entity);
            assert.strictEqual(typeof result.confirmed, 'number');
            assert.strictEqual(typeof result.death, 'number');
        }
    }]
];
