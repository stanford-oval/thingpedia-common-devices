// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2019 Giovanni Campagna <gcampagn@cs.stanford.edu>,Silei Xu <silei@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const assert = require('assert');
const Tp = require('thingpedia');

module.exports = [
    ['query', 'get_price', { currency: 'btc' }, (result) => {
        assert(result[0].price instanceof Tp.Value.Currency);
        assert(result[0].price.code === 'usd');
        assert(result[0].price.value >= 5000 && result[0].price.value <= 15000);
    }]
];
