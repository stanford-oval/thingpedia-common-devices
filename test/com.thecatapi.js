// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2018 Google LLC
//
// See LICENSE for details
"use strict";

const assert = require('assert');

module.exports = [
    ['query', 'get', {}, (results) => {
        assert.strictEqual(results.length, 1);
        for (let result of results) {
            assert.strictEqual(typeof result.image_id, 'string');
            assert(result.picture_url.startsWith('http://'));
            assert(result.link.startsWith('http://'));

            // assert that we don't put the picture in place of the link
            // (this happened once some time ago)
            assert(!result.link.endsWith('.png') && !result.link.endsWith('.jpg'));
        }
    }],

    ['query', 'get', { count: 2 }, (results) => {
        assert.strictEqual(results.length, 2);
        for (let result of results) {
            assert.strictEqual(typeof result.image_id, 'string');
            assert(result.picture_url.startsWith('http://'));
            assert(result.link.startsWith('http://'));

            // assert that we don't put the picture in place of the link
            // (this happened once some time ago)
            assert(!result.link.endsWith('.png') && !result.link.endsWith('.jpg'));
        }
    }]
];