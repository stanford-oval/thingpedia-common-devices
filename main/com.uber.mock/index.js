// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Jake Wu <jmhw123@gmail.com>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

module.exports = class UberDeviceClass extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'com.uber.mock';
        this.name = "Uber Account";
        this.description = "Request an Uber ride";
    }

    do_request({ start, end }, env) {
        console.log("Requesting an Uber.");
        console.log('From Location:');
        console.log(start);
        console.log('To Location:');
        console.log(end);
        return null;
    }
};
