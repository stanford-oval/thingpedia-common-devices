// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2019 Giovanni Campagna <gcampagn@cs.stanford.edu>,Silei Xu <silei@cs.stanford.edu>
// Copyright 2021 The Board of Trustees of the Leland Stanford Junior University
//
// See LICENSE for details
"use strict";

const assert = require('assert');
const Tp = require('thingpedia');

const S_STATE = 'on,off'.split(',');

module.exports = [
    ['query', 'power', {}, (result) => {
        if (typeof result[0] !== 'undefined')
            if (result[0].hasOwnProperty('power') && (typeof result[0].power !== 'undefined'))
                assert(S_STATE.includes(result[0].power), `Invalid automation status ${result[0].power}`);
    }]
];