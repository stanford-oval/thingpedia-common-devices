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

const DATA = require('./train_db.json');

module.exports = class extends Tp.BaseDevice {
    async get_Train() {
        return DATA.map((item) => {
            return {
                id: new Tp.Value.Entity(item.id.value, item.id.display),
                destination: new Tp.Value.Entity(item.destination.value, item.destination.display),
                departure: new Tp.Value.Entity(item.departure.value, item.departure.display),
                day: item.day,
                arrive_by: new Tp.Value.Time(item.arrive_by.split(":")[0], item.arrive_by.split(":")[1]),
                leave_at: new Tp.Value.Time(item.leave_at.split(":")[0], item.leave_at.split(":")[1]),
                price: new Tp.Value.Currency(item.price.value, item.price.code),
                duration: item.duration,
            };
        });
    }

    async do_make_booking({
        train, book_people
    }, env) {
        return {
            reference_number: 'Train: EFGHIK'
        };
    }
};
