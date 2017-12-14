// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Christopher Salvarani <csal@stanford.edu>
//                Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

const XKCD_RANDOM_URL = 'http://dynamic.xkcd.com/comic/random/';

const PREV_REGEXP = /<a\s+rel="prev"\s+href="(?:#|\/([0-9]+)\/)?"/;
const IMG_REGEXP = /<img\s+src="((?:https?:)?\/\/imgs\.xkcd\.com\/comics\/[A-Za-z0-9_()]+\.(?:png|jpg|jpeg))"\s+title="([^"]+)"\s+alt="([^"]+)"/;

module.exports = class XkcdDevice extends Tp.BaseDevice {
    constructor(engine, state) {
       super(engine, state);

       this.uniqueId = 'com.xkcd';
       this.name = "XKCD";
       this.description = "A webcomic of romance, sarcasm, math, and language.";
    }

    _scrapeXkcd(url) {
        return Tp.Helpers.Http.get(url).then((response) => {
            // the response is HTML, which we can't easily parse as XML
            // (there are invalid entities here and there)

            const aMatch = PREV_REGEXP.exec(response);
            const imgMatch = IMG_REGEXP.exec(response);
            if (imgMatch === null || aMatch === null)
                throw new Error('Failed to scrape XKCD');

            let number;
            if (aMatch[1] === undefined)
                number = 1;
            else
                number = parseInt(aMatch[1])+1;
            return Promise.all([number, imgMatch[1],
                // wrap in XML and parse to resolve entities (and hope for the best...)
                Tp.Helpers.Xml.parseString('<foo>' + imgMatch[2] + '</foo>'),
                Tp.Helpers.Xml.parseString('<foo>' + imgMatch[3] + '</foo>')]);
        }).then((result) => {
            let number = result[0];
            let picture_url = result[1];
            if (!picture_url.startsWith('http'))
                picture_url = 'http:' + picture_url;
            let link = 'https://xkcd.com/' + number;
            // note: here alt_text has the xkcd meaning (ie,
            // the popover text), but the HTML attributes are swapped!
            let alt_text = result[2].foo;
            let title = result[3].foo;

            return [{ number, title, picture_url, link, alt_text }];
        });
    }

    get_get_comic({ number }, count, filter) {
        // ignore count and filter

        return this._scrapeXkcd('http://xkcd.com/' + (number === undefined ? '' : number));
    }

    get_random_comic() {
        return this._scrapeXkcd(XKCD_RANDOM_URL);
    }

    get_what_if() {
        return Tp.Helpers.Rss.get('http://what-if.xkcd.com/feed.atom');
    }
};
