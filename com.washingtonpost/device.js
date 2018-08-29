// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Shloka Desai <shloka@stanford.edu>
//           2016-2018 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

const BLOGS = {
    the_fix: 'http://feeds.washingtonpost.com/rss/rss_the-fix',
    politics: 'http://feeds.washingtonpost.com/rss/rss_election-2012',
    powerpost: 'http://feeds.washingtonpost.com/rss/rss_powerpost',
    fact_checker: 'http://feeds.washingtonpost.com/rss/rss_fact-checker',
    world_views: 'http://feeds.washingtonpost.com/rss/rss_blogpost',
    compost: 'http://feeds.washingtonpost.com/rss/rss_compost',
    the_plum_line: 'http://feeds.washingtonpost.com/rss/rss_plum-line',
    post_partisan: 'http://feeds.washingtonpost.com/rss/rss_post-partisan',
    post_everything: 'http://feeds.washingtonpost.com/rss/rss_post-everything',
    right_turn: 'http://feeds.washingtonpost.com/rss/rss_right-turn',
    capital_weather_gang: 'http://feeds.washingtonpost.com/rss/rss_capital-weather-gang',
    morning_mix: 'http://feeds.washingtonpost.com/rss/rss_morning-mix',
    wonkblog: 'http://feeds.washingtonpost.com/rss/rss_wonkblog'
};

module.exports = class WashingtonPostDevice extends Tp.BaseDevice {
    constructor(engine, state) {
         super(engine, state);

         this.uniqueId = 'com.washingtonpost';
         this.name = "The Washington Post";
         this.description = "Breaking News, World, US, DC News & Analysis";
    }

    get_get_article({ section }) {
        const url = 'http://feeds.washingtonpost.com/rss/' + section;
        return Tp.Helpers.Rss.get(url);
    }

    get_get_blog_post({ section }) {
        const url = BLOGS[section];
        return Tp.Helpers.Rss.get(url);
    }
};
