// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of org.schema
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

module.exports = class extends Tp.BaseDevice {

    async do_make_booking({
        destination, departure, arrive_by, leave_at
    }, env) {
        return {
            reference_number: 'TAXI: XXXXX',
            car: 'TAXI CAR: YYYYY'
        };
    }
};
