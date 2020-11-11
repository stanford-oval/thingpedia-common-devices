// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2018 Google LLC
//
// See LICENSE for details
"use strict";

const assert = require('assert');

module.exports = [
    ['query', 'slides', {}, (results) => {
        for (let result of results)
            assert.strictEqual(typeof result.link, 'string');
    }]
];
