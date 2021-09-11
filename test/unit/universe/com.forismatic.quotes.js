// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2020 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const assert = require('assert');

module.exports = [
    ['query', 'get', {}, (result) => {
        assert(typeof result[0].text === 'string');
        assert(typeof result[0].author === 'string' || result[0].author === undefined);
        assert(typeof result[0].link === 'string');
    }]
];
