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
        assert.deepStrictEqual(result[0], {
            artists: [
                new Tp.Value.Entity('spotify:artist:4V8Sr092TqfHkfAA5fXXqG', 'Luis Fonsi'),
                new Tp.Value.Entity('spotify:artist:4VMYDCV2IEDYJArk749S6m', 'Daddy Yankee'),
                new Tp.Value.Entity('spotify:artist:1uNFoZAHBGtllmzznpCI3s', 'Justin Bieber')
            ],
            genres: ['latin', 'latin pop', 'puerto rican pop', 'tropical'],
            danceability: 65.3,
            energy: 81.6,
            popularity: 74,

            id: new Tp.Value.Entity('spotify:track:6rPO02ozF3bM7NnOV4h6s2', 'Despacito - Remix'),
            release_date: new Date('2017-04-17T00:00:00.000Z')
        });
    }]
];