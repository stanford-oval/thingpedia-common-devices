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

        // Unfortunately, the feeds above do not have pubDate set properly for the articles,
        // so we cannot use the generic RSS code

        return Tp.Helpers.Http.get(url).then(Tp.Helpers.Xml.parseString).then((parsed) => {
            const result = [];
            for (var entry of parsed.rss.channel[0].item) {
                result.push({
                    title: entry.title[0],
                    link: entry.link[0],
                    description: entry.description ? entry.description[0] : '',
                    picture_url: entry['media:group'] && entry['media:group'][0]['media:content'] ? entry['media:group'][0]['media:content'][2].$.url : ''
                });
            }
            return result;
        });
    }

    get_get_blog_post({ section }) {
        const url = BLOGS[section];

        // Unlike newspaper sections, the blog use more or less standard wordpress and
        // implement rss properly, so we can just leave it to the generic code
        return Tp.Helpers.Rss.get(url);
    }
};
