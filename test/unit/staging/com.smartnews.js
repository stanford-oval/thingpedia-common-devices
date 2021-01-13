// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2020 Jack Wang <jackweijiawang@gmail.com>
//
// See LICENSE for details
"use strict";

const assert = require('assert');

module.exports = [
    ['query', 'article', {}, (results) => {
        console.log(results);
        assert(true, 'something');
    }]/*
    ['query', 'article', {counter:3}, (results) => {
        console.log(results);
    }],
    ['action', 'pocket', {news_url:"https://www.mashed.com/202920/foods-you-should-never-cook-in-a-cast-iron-skillet/"}, (results) => {
        console.log(results);
    }*/
];
