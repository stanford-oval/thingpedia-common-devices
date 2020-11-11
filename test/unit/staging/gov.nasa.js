// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2019 Giovanni Campagna <gcampagn@cs.stanford.edu>,Silei Xu <silei@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const assert = require('assert');

module.exports = [
    ['query', 'rover', { date_taken: new Date('2019-11-01T00:00:00.000-0800') }, (results) => {
        for (let result of results) {
            assert(result.date_taken instanceof Date);
            assert(result.picture_url.startsWith('http://mars.jpl.nasa.gov'));
            assert(result.camera_used.isEntity);
        }
    }],
];
