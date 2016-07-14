// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Christopher Salvarani <csal@stanford.edu>
//                Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');
const NewXkcd = require('./new_comic');
const NewWhatIf = require('./new_whatif');
const ScrapeXkcd = require('./scrape_xkcd');

const XKCD_RANDOM_URL = 'http://dynamic.xkcd.com/comic/random/';

const RandomXkcd = ScrapeXkcd('RandomXkcd', () => XKCD_RANDOM_URL);
const GetXkcd = ScrapeXkcd('GetXkcd', function(filters) {
    if (filters[0] === undefined || filters[0] === null)
        return 'http://xkcd.com/';
    else
        return 'http://xkcd.com/' + filters[0];
});

module.exports = new Tp.DeviceClass({
    Name: 'XkcdDevice',

    _init: function(engine, state) {
       this.parent(engine, state);

       this.uniqueId = 'com.xkcd';
       this.name = "XKCD";
       this.description = "A webcomic of romance, sarcasm, math, and language.";
    },

    getQueryClass(id) {
        switch(id) {
        case 'get_comic':
            return GetXkcd;
        case 'random_comic':
            return RandomXkcd;
        default:
            throw new Error('Invalid query ' + id);
        }
    }
});
