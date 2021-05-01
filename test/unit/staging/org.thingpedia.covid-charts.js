// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2020 James Zhuang <james.zhuang@stanford.edu>
//
// See LICENSE for details
"use strict";

const assert = require('assert');
const Tp = require('thingpedia');

module.exports = [

    ['query', 'cases', "ca", (result) => {
        console.log('cases: ' + result);
    }],

    ['query', 'new_cases', "texas", (result) => {
        console.log('new_cases: ' + result);
    }],

    ['query', 'deaths', "santa clara", (result) => {
        console.log('deaths:' + result);
    }],

    ['query', 'new_deaths', "ca", (result) => {
        console.log('new deaths: ' + result);
    }],

    ['query', 'vaccines_initiated', "ca", (result) => {
        console.log('vaccines initiated: ' + result);
    }],

    ['query', 'vaccines_completed', "ca", (result) => {
        console.log('vaccines_completed: ' + result);
    }],

    ['query', 'case_density', "ca", (result) => {
        console.log('case_density: ' + result);
    }],

    ['query', 'icu_capacity', "ca", (result) => {
        console.log('icu_capacity: ' + result);
    }],

    ['query', 'infection_rate', "ca", (result) => {
        console.log('infection_rate: ' + result);
    }],

    ['query', 'positivity_rate', "ca", (result) => {
        console.log('positivity_rate: ' + result);
    }],


];
