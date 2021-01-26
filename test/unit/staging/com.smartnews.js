// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2020 Jack Wang <jackweijiawang@gmail.com>
//
// See LICENSE for details

"use strict";

const assert = require('assert');

console.log("SmartNews Device Test Case:");

module.exports = [
    ['query', 'top_articles', { counter: 3 }, (results) => {
        //console.log(results);
        assert(true, 'something');
    }]
];