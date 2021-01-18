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
    ['query', 'comic', {}, {}, (results) => {
        assert.strictEqual(results.length, 1);
        const xkcd = results[0];
        assert(typeof xkcd.id === 'number');
        assertNonEmptyString(xkcd.title);
        assertNonEmptyString(xkcd.alt_text);
        assert(xkcd.link.startsWith('https://xkcd.com'));
        assert(xkcd.picture_url.startsWith('https://') &&
               xkcd.picture_url.indexOf('xkcd.com') >= 0);
    }],

    ['query', 'comic', {}, { filter: [ ['id', '==', 1024] ] }, (results) => {
        assert.strictEqual(results.length, 1);
        const xkcd = results[0];
        assert.strictEqual(xkcd.id, 1024);
        assert.strictEqual(xkcd.title, 'Error Code');
        assert.strictEqual(xkcd.alt_text, 'It has a section on motherboard beep codes that lists, for each beep pattern, a song that syncs up well with it.');
        assert.strictEqual(xkcd.link, 'https://xkcd.com/1024');
        assert.strictEqual(xkcd.picture_url, 'https://imgs.xkcd.com/comics/error_code.png');
    }],

    ['query', 'comic', {}, { filter: [ ['release_date', '==', new Date(2020, 11, 16)] ] }, (results) => {
        assert(results.length >= 1);
        const xkcd = results[0];
        assert.strictEqual(xkcd.id, 2399);
        assert.strictEqual(xkcd.title, '2020 Election Map');
        assert.strictEqual(xkcd.alt_text, 'There are more Trump voters in California than Texas, more Biden voters in Texas than New York, more Trump voters in New York than Ohio, more Biden voters in Ohio than Massachusetts, more Trump voters in Massachusetts than Mississippi, and more Biden voters in Mississippi than Vermont.');
        assert.strictEqual(xkcd.link, 'https://xkcd.com/2399');
        assert.strictEqual(xkcd.picture_url, 'https://imgs.xkcd.com/comics/2020_election_map.png');
    }],

    ['query', 'random_comic', {}, (results) => {
        assert.strictEqual(results.length, 1);
        const xkcd = results[0];
        assert(typeof xkcd.id === 'number');
        assertNonEmptyString(xkcd.title);
        assertNonEmptyString(xkcd.alt_text);
        assert(xkcd.link.startsWith('https://xkcd.com'));
        assert(xkcd.picture_url.startsWith('https://') &&
               xkcd.picture_url.indexOf('xkcd.com') >= 0);
    }],
];
