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

const DATA = require('./hotel_db.json');

module.exports = class extends Tp.BaseDevice {
    async get_Hotel() {
        return DATA.map((item) => {
            return {
                id: new Tp.Value.Entity(item.id.value, item.id.display),
                food: item.food,
                price_range: item.price_range,
                area: item.area,
                type: item.type,
                stars: item.stars,
                parking: item.parking,
                internet: item.internet,
                phone: item.phone,
                postcode: item.postcode,
                address: item.address,
            };
        });
    }

    async do_make_booking({
        hotel, book_day, book_people, book_stay
    }, env) {
        // make the reservation ...
        let successful = true;
        if (successful) {
            return {
                reference_number: 'HOTEL: XXXXX'
            };
        } else {
            throw new Error('no tables available');
        }
    }
};
