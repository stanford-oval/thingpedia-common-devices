// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2018 Google LLC
//
// See LICENSE for details
"use strict";

const assert = require('assert');

module.exports = [
    ['query', 'search', { query: 'acl' }, (results) => {
        for (let result of results) {
            assert.strictEqual(typeof result.abbr, 'string');
            assert.strictEqual(typeof result.name, 'string');
            assert(result.start instanceof Date);
            assert(result.end instanceof Date);
            assert(result.deadline instanceof Date);
            assert.strictEqual(typeof result.link, 'string');
        }
    }]
];
