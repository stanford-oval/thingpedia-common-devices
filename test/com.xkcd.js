// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2018 Google LLC
//
// See LICENSE for details
"use strict";

const assert = require('assert');

function assertNonEmptyString(what) {
    assert(typeof what === 'string' && what, 'Expected a non-empty string, got ' + what);
}

module.exports = [
    ['query', 'get_comic', {}, (results) => {
        assert.strictEqual(results.length, 1);
        const xkcd = results[0];
        assertNonEmptyString(xkcd.title);
        assertNonEmptyString(xkcd.alt_text);
        assert(xkcd.link.startsWith('https://xkcd.com'));
        assert(xkcd.picture_url.startsWith('https://') &&
               xkcd.picture_url.indexOf('xkcd.com') >= 0);
    }],

    ['query', 'get_comic', { number: 1024 }, (results) => {
        assert.strictEqual(results.length, 1);
        const xkcd = results[0];
        assert.strictEqual(xkcd.title, 'Error Code');
        assert.strictEqual(xkcd.alt_text, 'It has a section on motherboard beep codes that lists, for each beep pattern, a song that syncs up well with it.');
        assert.strictEqual(xkcd.link, 'https://xkcd.com/1024');
        assert.strictEqual(xkcd.picture_url, 'https://imgs.xkcd.com/comics/error_code.png');
    }],

    ['query', 'random_comic', {}, (results) => {
        assert.strictEqual(results.length, 1);
        const xkcd = results[0];
        assertNonEmptyString(xkcd.title);
        assertNonEmptyString(xkcd.alt_text);
        assert(xkcd.link.startsWith('https://xkcd.com'));
        assert(xkcd.picture_url.startsWith('https://') &&
               xkcd.picture_url.indexOf('xkcd.com') >= 0);
    }],

    ['query', 'what_if', {}, (results) => {
        for (let result of results) {
            assertNonEmptyString(result.title);

            // FIXME this is broken because the Thingpedia RSS
            // library does not handle namespaces correctly
            //assert(result.link.startsWith('https://what-if.xkcd.com'), `Expected a link, got ${result.link}`);
        }
    }]
];
