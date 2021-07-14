// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2019 Giovanni Campagna <gcampagn@cs.stanford.edu>,Silei Xu <silei@cs.stanford.edu>
// Copyright 2021 The Board of Trustees of the Leland Stanford Junior University
//
// See LICENSE for details
"use strict";

const assert = require('assert');
const Tp = require('thingpedia');

const S_STATE = 'detecting,not_detecting'.split(',');

module.exports = [
    ['query', 'motion', {}, (result) => {
        assert(S_STATE.includes(result[0].state), `Invalid motion sensor status ${result[0].state}`);
    }]
];