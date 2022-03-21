// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2021 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Jake Wu <jmhw0123@gmail.com>
//
// See LICENSE for details
"use strict";

const assert = require('assert');
const Tp = require('thingpedia');

module.exports = [
    ['query', 'station', {}, {}, (results) => {
        console.log(results);
        assert(results instanceof Array);
        assert(typeof results[0].title === 'string');
        assert(typeof results[0].description === 'string');
        assert(typeof results[0].link === 'string');
        assert(results[0].date instanceof Date);
        assert(typeof results[0].duration === 'number');
    }],
];
