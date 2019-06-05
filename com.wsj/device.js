// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2018 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

const URLS = {
    opinions: 'https://feeds.a.dj.com/rss/RSSOpinion.xml',
    world_news: 'https://feeds.a.dj.com/rss/RSSWorldNews.xml',
    us_business: 'https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml',
    markets: 'https://feeds.a.dj.com/rss/RSSMarketsMain.xml',
    technology: 'https://feeds.a.dj.com/rss/RSSWSJD.xml',
    lifestyle: 'https://feeds.a.dj.com/rss/RSSLifestyle.xml'
};

module.exports = class WSJDevice extends Tp.BaseDevice {
    constructor(engine, state) {
         super(engine, state);

         this.uniqueId = 'com.wsj';
         this.name = "The Wall Street Journal";
         this.description = "Breaking News, Business, Financial and Economic News, World News and Video";
    }

    get_get({ section }) {
        const url = URLS[section];
        return Tp.Helpers.Rss.get(url);
    }
};
