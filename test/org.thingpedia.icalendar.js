// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2019 Giovanni Campagna <gcampagn@cs.stanford.edu>,Silei Xu <silei@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const assert = require('assert');

module.exports = [
    ['query', 'list_events', {}, (results) => {
        for (let result of results) {
            assert(result.start_date instanceof Date);
            assert(result.end_date instanceof Date);
            assert(typeof result.summary === 'string');
            assert(typeof result.description === 'string');
            assert(typeof result.sequence === 'number');
            assert(typeof result.organizer === 'string');
            assert(typeof result.location === 'string');
            assert(['scheduled', 'upcoming', 'started', 'ended'].includes(result.status));
        }
    }],
];
