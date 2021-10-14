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
    
    ['query', 'article', {}, {}, (result) => {
        let tmp = undefined;
        try {
            assert(result instanceof Array);
            for (const item of result) {
                tmp = item;
                assert(item.id.constructor.name.toLowerCase() === 'entity');
                assert(item.id instanceof Tp.Value.Entity);
                assert(String(item.id).match(/\d+/));
                assert(typeof item.title === 'string');
                if (item.author)
                    assert(typeof item.author === 'string');
                if (item.source)
                    assert(typeof item.source === 'string');
                assert(typeof item.summary === 'string');
                assert(item.link.startsWith('https://'), `Expected link to start with http://, got ${item.link}`);
                assert(Array.isArray(item.category));
                // console.log(item.category[0].constructor.name)
                assert(item.category[0] instanceof Tp.Value.Entity);
                assert(item.date instanceof Date);
                assert(item.headline_audio_url.startsWith('https://'), `Expected link to start with https://, got ${item.headline_audio_url}`);
                assert(item.summary_audio_url.startsWith('https://'), `Expected link to start with https://, got ${item.summary_audio_url}`);
            }
        } catch (error) {
            console.log(tmp.id.constructor.name);
            console.log('parsed news items: ' + JSON.stringify(tmp, null, 2));
            throw Error(error);
        }
    }],

    ['query', 'article', {}, {
        filter: [
            ['date', '>=', new Date("2021-10-03")],
            ['date', '<=', new Date("2021-10-04")]
        ]
    }, (result) => {
        let tmp = undefined;
        try {
            const start_date = new Date("2021-10-03");
            const end_date = new Date("2021-10-04");
            for (const item of result) {
                tmp = item;
                assert(item.id instanceof Tp.Value.Entity);
                assert(String(item.id).match(/\d+/));
                assert(typeof item.title === 'string');
                if (item.author)
                    assert(typeof item.author === 'string');
                if (item.source)
                    assert(typeof item.source === 'string');
                assert(typeof item.summary === 'string');
                assert(item.link.startsWith('https://'), `Expected link to start with https://, got ${item.link}`);
                assert(Array.isArray(item.category));
                assert(item.category[0] instanceof Tp.Value.Entity);
                assert(item.date instanceof Date);
                assert((item.date.getTime() >= start_date.getTime()) && (item.date.getTime() < end_date.getTime()));
                assert(item.headline_audio_url.startsWith('https://'), `Expected link to start with https://, got ${item.headline_audio_url}`);
                assert(item.summary_audio_url.startsWith('https://'), `Expected link to start with https://, got ${item.summary_audio_url}`);
            }
        } catch (error) {
            console.log('parsed news items: ' + JSON.stringify(tmp, null, 2));
            throw Error(error);
        }
    }]
];
