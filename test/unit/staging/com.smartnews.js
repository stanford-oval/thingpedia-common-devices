// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2020 Jack Wang <jackweijiawang@gmail.com>
//
// See LICENSE for details

"use strict";

const assert = require('assert');

console.log("SmartNews Device Test Case:");

module.exports = [
    ['query', 'article', { count: 2 }, (results) => {
        console.log(results);
        assert(true, 'something');
    }],
    ['query', 'reading_list', {}, (results) => {
        console.log(results);
        assert(true, 'something');
    }]
];