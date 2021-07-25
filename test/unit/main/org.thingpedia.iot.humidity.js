// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2019 Giovanni Campagna <gcampagn@cs.stanford.edu>,Silei Xu <silei@cs.stanford.edu>
// Copyright 2021 The Board of Trustees of the Leland Stanford Junior University
//
// See LICENSE for details
"use strict";

const assert = require('assert');
const Tp = require('thingpedia');

const S_STATE = 'humid,normal'.split(',');

module.exports = [
    ['query', 'humidity', {}, (result) => {
        if (typeof result[0] !== 'undefined')
            if (result[0].hasOwnProperty('value') && (typeof result[0].value !== 'undefined'))
                assert(typeof result[0].value === 'number');

        if (typeof result[0] !== 'undefined')
            if (result[0].hasOwnProperty('state') && (typeof result[0].state !== 'undefined'))
                assert(S_STATE.includes(result[0].state), `Invalid humidity sensor status ${result[0].state}`);
    }]
];