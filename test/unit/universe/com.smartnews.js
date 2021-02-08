// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2020 Jack Wang <jackweijiawang@gmail.com>
//
// See LICENSE for details

"use strict";

const assert = require('assert');

function assertNonEmptyString(what) {
    assert(typeof what === 'string' && what, 'Expected a non-empty string, got ' + what);
}

module.exports = [
    ['query', 'article', {}, (results) => {
        for (const res of results) {
            assertNonEmptyString(res.title);
            assert(res.date instanceof Date);
            assertNonEmptyString(res.source);
        }
    }]
    // ['query', 'reading_list', {}, (results) => {
    //     console.log(results);
    //     assert(true, 'something');
    // }]
];
