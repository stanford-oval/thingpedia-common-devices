// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2020 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const assert = require('assert');
const Tp = require('thingpedia');

module.exports = [
    ['query', 'song', {}, {
        filter: [
            ['id', '=~', 'despacito']
        ]
    }, (result) => {
        assert.deepStrictEqual(result[0].artists, [
            new Tp.Value.Entity('spotify:artist:4V8Sr092TqfHkfAA5fXXqG', 'Luis Fonsi'),
            new Tp.Value.Entity('spotify:artist:4VMYDCV2IEDYJArk749S6m', 'Daddy Yankee'),
        ]);
        assert.deepStrictEqual(result[0].album, new Tp.Value.Entity('spotify:album:5C0YLr4OoRGFDaqdMQmkeH', 'VIDA'));
        assert.deepStrictEqual(result[0].genres, ['latin', 'latin pop', 'puerto rican pop']);
        // 65.5
        assert(result[0].danceability >= 60 && result[0].danceability <= 70);
        // 79.7
        assert(result[0].energy >= 75 && result[0].energy <= 85);

        assert(typeof result[0].popularity === 'number');

        assert.deepStrictEqual(result[0].id, new Tp.Value.Entity('spotify:track:6habFhsOp2NvshLv26DqMb', 'Despacito'));
        assert.deepStrictEqual(result[0].release_date, new Date('2019-02-01T00:00:00.000Z'));
    }],
    ['query', 'playable', {}, {
        filter: [
            ['id', '=~', 'bohemian rhapsody']
        ]
    }, (result) => {
        assert.deepStrictEqual(result[0].artists, [
            new Tp.Value.Entity('spotify:artist:1dfeR4HaWDbWqFHLkxsg1d', 'Queen')
        ]);
        assert.deepStrictEqual(result[0].genres, ['classic rock', 'glam rock', 'rock']);
        assert(typeof result[0].popularity === 'number');

        assert.deepStrictEqual(result[0].id, new Tp.Value.Entity('spotify:track:7tFiyTwD0nx5a1eklYtX2J', 'Bohemian Rhapsody - Remastered 2011'));
        assert.deepStrictEqual(result[0].release_date, new Date('1975-11-21T00:00:00.000Z'));
    }],
];
