// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2019 Giovanni Campagna <gcampagn@cs.stanford.edu>,Silei Xu <silei@cs.stanford.edu>
//
// See LICENSE for details

"use strict";

const assert = require('assert');

module.exports = [
    ['query', 'articles', {}, (results) => {
        for (let result of results) {
            assert(result.title === null || typeof result.title === 'string');
            assert(result.link === null || result.link.startsWith('http'));
            assert(result.updated instanceof Date);
        }
    }]
];
