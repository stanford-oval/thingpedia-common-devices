// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2021 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Jake Wu <jmhw0123@gmail.com>
//
// See LICENSE for details
"use strict";

const assert = require('assert');
const Tp = require('thingpedia');

module.exports = [
    ['query', 'station', {}, {
        filter: [
            ['id', '=~', 'espn']
        ]
    }, (results) => {
        assert(results instanceof Array);
        assert.deepStrictEqual(results[0].id, new Tp.Value.Entity('station:s25876', 'ESPN Radio'));
        assert(results[0].show instanceof Tp.Value.Entity);
        assert(typeof results[0].link === 'string');
        assert(results[0].link === 'http://opml.radiotime.com/Tune.ashx?id=s25876');
        assert(results[0].image === 'http://cdn-profiles.tunein.com/s25876/images/logoq.jpg?t=1');
    }],
    ['query', 'station', {}, {
        filter: [
            ['id', '=~', 'espn chicago']
        ]
    }, (results) => {
        assert(results instanceof Array);
        assert.deepStrictEqual(results[0].id, new Tp.Value.Entity('station:s21297', 'ESPN Chicago'));
        assert(results[0].show instanceof Tp.Value.Entity);
        assert(typeof results[0].link === 'string');
        assert(results[0].link === 'http://opml.radiotime.com/Tune.ashx?id=s21297');
        assert(results[0].image === 'http://cdn-profiles.tunein.com/s21297/images/logoq.jpg');
    }],
    ['query', 'most_popular_stations', {}, (results) => {
        assert(results instanceof Array);
        for (const item of results) {
            assert(item.id instanceof Tp.Value.Entity);
            assert(item.show instanceof Tp.Value.Entity);
            assert(typeof item.link === 'string');
            assert(typeof item.image === 'string');
            assert(item.link.startsWith('http://'), `Expected link to start with http://, got ${item.link}`);
            assert(item.image.startsWith('http://'), `Expected image to start with http://, got ${item.image}`);
        }
    }],
    ['query', 'local_stations', {}, (results) => {
        assert(results instanceof Array);
        for (const item of results) {
            assert(item.id instanceof Tp.Value.Entity);
            assert(item.show instanceof Tp.Value.Entity);
            assert(typeof item.link === 'string');
            assert(typeof item.image === 'string');
            assert(item.link.startsWith('http://'), `Expected link to start with http://, got ${item.link}`);
            assert(item.image.startsWith('http://'), `Expected image to start with http://, got ${item.image}`);
        }
    }],
];