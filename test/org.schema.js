// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2019 Giovanni Campagna <gcampagn@cs.stanford.edu>,Silei Xu <silei@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const assert = require('assert');
const Tp = require('thingpedia');

module.exports = [
    ['query', 'Restaurant', {}, (results) => {
        for (let result of results) {
            //console.log(result);
            assert(result.id instanceof Tp.Value.Entity);
            assert(typeof result.id.value === 'string' && result.id.value);
            assert(typeof result.id.display === 'string');
        }
    }],

    ['query', 'Hotel', {}, (results) => {
        for (let result of results) {
            //console.log(result);
            assert(result.id instanceof Tp.Value.Entity);
            assert(typeof result.id.value === 'string' && result.id.value);
            assert(typeof result.id.display === 'string');
        }
    }]
];
