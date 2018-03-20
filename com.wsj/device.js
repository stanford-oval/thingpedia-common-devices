// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2018 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

const URLS = {
    opinions: 'http://www.wsj.com/xml/rss/3_7041.xml',
    world_news: 'http://www.wsj.com/xml/rss/3_7085.xml',
    us_business: 'http://www.wsj.com/xml/rss/3_7014.xml',
    markets: 'http://www.wsj.com/xml/rss/3_7031.xml',
    technology: 'http://www.wsj.com/xml/rss/3_7455.xml',
    lifestyle: 'http://www.wsj.com/xml/rss/3_7201.xml'
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
