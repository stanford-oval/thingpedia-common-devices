// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2018 Google LLC
//
// See LICENSE for details
"use strict";

const assert = require('assert');

function assertNonEmptyString(what) {
    assert(typeof what === 'string' && what, 'Expected a non-empty string, got ' + what);
}

module.exports = [];

for (let section of `politics,opinions,local,sports,national,world,business,lifestyle`.split(',')) {
    module.exports.push(['query', 'get_article', { section }, (results) => {
        for (let result of results) {
            assertNonEmptyString(result.title);
            assert.strictEqual(typeof result.description, 'string');
            assert(result.link.startsWith('http'), `Expected a link, got ${result.link}`);
            assert(result.picture_url === null || result.picture_url.startsWith('http'),
                   `Expected a picture or null, got ${result.picture_url}`);
        }
    }]);
}
for (let section of `the_fix,politics,powerpost,fact_checker,world_views,compost,the_plum_line,post_partisan,post_everything,right_turn,capital_weather_gang,morning_mix,wonkblog`.split(',')) {
    module.exports.push(['query', 'get_blog_post', { section }, (results) => {
        const oneWeekAgo = new Date;
        oneWeekAgo.setTime(oneWeekAgo.getTime() - 7 * 3600 * 24 * 1000);

        for (let result of results) {
            assertNonEmptyString(result.title);
            assert.strictEqual(typeof result.description, 'string');
            assert(result.link.startsWith('http'), `Expected a link, got ${result.link}`);

            // FIXME the following is broken, until a new version of thingpedia-api is out
            //assert(result.updated instanceof Date,
            //       `Expected a date, got ${result.updated}`);
            // assert that all articles are recent
            //assert(+result.updated >= +oneWeekAgo);
        }
    }]);
}
