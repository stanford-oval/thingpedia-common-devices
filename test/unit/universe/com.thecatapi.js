// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2018 Google LLC
//
// See LICENSE for details
"use strict";

const assert = require('assert');

module.exports = [
    ['query', 'cat', {}, {}, (results) => {
        assert.strictEqual(results.length, 1);
        for (let result of results) {
            assert.strictEqual(typeof result.id, 'string');
            assert(result.picture_url.startsWith('http://') || result.picture_url.startsWith('https://'),
                   `Expected picture to start with http://, got ${result.picture_url}`);
            assert(result.link.startsWith('http://'),
                   `Expected link to start with http://, got ${result.link}`);

            // assert that we don't put the picture in place of the link
            // (this happened once some time ago)
            assert(!result.link.endsWith('.png') && !result.link.endsWith('.jpg'),
                   `Expected link to end with .png or .jpg, got ${result.link}`);
        }
    }],

    ['query', 'cat', {}, { limit: 2 }, (results) => {
        assert.strictEqual(results.length, 2);
        for (let result of results) {
            assert.strictEqual(typeof result.id, 'string');
            assert(result.picture_url.startsWith('http://') || result.picture_url.startsWith('https://'),
                   `Expected picture to start with http://, got ${result.picture_url}`);
            assert(result.link.startsWith('http://'),
                   `Expected link to start with http://, got ${result.link}`);

            // assert that we don't put the picture in place of the link
            // (this happened once some time ago)
            assert(!result.link.endsWith('.png') && !result.link.endsWith('.jpg'),
                   `Expected link to end with .png or .jpg, got ${result.link}`);
        }
    }]
];
