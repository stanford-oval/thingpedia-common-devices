// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2021 The Board of Trustees of the Leland Stanford Junior University
//
// See LICENSE for details
"use strict";

const assert = require('assert');
const Tp = require('thingpedia');

const S_OPENCLOSED = 'open,closed'.split(',');

module.exports = [
    ['query', 'state', {}, (result) => {
        assert(S_OPENCLOSED.includes(result[0].state), `Invalid cover status ${result[0].state}`);
    }]
];