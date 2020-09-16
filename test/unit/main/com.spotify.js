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
            ],
            album: new Tp.Value.Entity('spotify:album:5C0YLr4OoRGFDaqdMQmkeH', 'VIDA'),
            genres: ['latin', 'latin pop', 'puerto rican pop', 'tropical'],
            danceability: 65.5,
            energy: 79.7,
            popularity: 79,

            id: new Tp.Value.Entity('spotify:track:6habFhsOp2NvshLv26DqMb', 'Despacito'),
            release_date: new Date('2019-02-01T00:00:00.000Z')
        });
    }]
];
