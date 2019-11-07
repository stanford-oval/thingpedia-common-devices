// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2019 Giovanni Campagna <gcampagn@cs.stanford.edu>,Silei Xu <silei@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const assert = require('assert');

module.exports = [
    ['query', 'query', { author: 'silei xu'}, (results) => {
        for (let result of results) {
            assert(typeof result.title === 'string');
            assert(typeof result.author === 'string');
            assert(result.pubDate instanceof Date);
            assert(result.link.startsWith('http'));
            assert(typeof result.summary === 'string');
        }
    }],

    ['query', 'query', { query: 'virtual assistant', author: 'silei xu'}, (results) => {
        for (let result of results) {
            assert(typeof result.title === 'string');
            assert(typeof result.author === 'string');
            assert(result.pubDate instanceof Date);
            assert(result.link.startsWith('http'));
            assert(typeof result.summary === 'string');
        }
    }],

    ['query', 'query', { category: 'machine learning', author: 'silei xu'}, (results) => {
        for (let result of results) {
            assert(typeof result.title === 'string');
            assert(typeof result.author === 'string');
            assert(result.pubDate instanceof Date);
            assert(result.link.startsWith('http'));
            assert(typeof result.summary === 'string');
        }
    }],
];
