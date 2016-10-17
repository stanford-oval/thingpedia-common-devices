// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Shloka Desai <shloka@stanford.edu>
//                Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

const SECTIONS = {
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
}

// Unlike newspaper sections, the blog use more or less standard wordpress and
// implement rss properly, so we can just leave it to the generic code

module.exports = new Tp.ChannelClass({
    Name: 'WashingPostNewBlogPostTrigger',
    Extends: Tp.RSSPollingTrigger,
    RequiredCapabilities: ['channel-state'],
    interval: 3 * 3600 * 1000, // 3 hours

    _init: function(engine, state, device, params) {
        this.parent(engine, state, device);

        this.section = params[0];
        if (!this.section)
            throw new Error('Missing required parameter');
        this.url = SECTIONS[this.section];
        this.filterString = this.section;
    },

    formatEvent(event) {
        var section = event[0];
        var title = event[1];
        var link = event[2];

        return [{ type: 'rdl',
            displayTitle: title,
            callback: link,
            webCallback: link
        }];
    },

    _emit(entry) {
        var title = entry[0];
        var link = entry[1];
        this.emitEvent([this.section, title, link]);
    }
});
