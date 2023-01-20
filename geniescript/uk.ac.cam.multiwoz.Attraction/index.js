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

const DATA = require('./attraction_db.json');

module.exports = class extends Tp.BaseDevice {
    async get_Attraction() {
        return DATA.map((item) => {
            return {
                id: new Tp.Value.Entity(item.id.value, item.id.display),
                area: item.area,
                type: new Tp.Value.Entity(item.type, item.type),
                phone: item.phone,
                address: item.address,
                postcode: item.postcode,
                openhours: item.openhours,
                price_range: item.price_range,
                entrance_fee: item.entrance_fee
            };
        });
    }

    async do_make_reservation() {
        return {
            reference_number: 'Attraction: XXXXX'
        };
    }
};
