// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Shloka Desai <shloka@stanford.edu>
//                Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

module.exports = class PhdComicsDevice extends Tp.BaseDevice {
    constructor(engine, state) {
         super(engine, state);

         this.url = "http://phdcomics.com/gradfeed.php";
         this.uniqueId = 'com.phdcomics';
         this.name = "Piled Higher and Deeper";
         this.description = "This is the PhD comics RSS Feed";
    }

    get_get_post() {
        return Tp.Helpers.Http.get(this.url).then((response) => Tp.Helpers.Xml.parseString(response))
        .then((parsed) => {
            let result = [];
            for (let entry of parsed.rss.channel[0].item) {
                let updated_time = new Date(entry.pubDate[0]);
                let title = entry.title[0]._ || entry.title[0];
                let link = entry.link[0]._ || entry.link[0];
                let description = entry.description[0] ? (entry.description[0]._ || entry.description[0]) : '';

                let match = /<img.+src="([^"]+)"/g.exec(description);
                if (match === null) {
                    console.error('Failed to scrape PhdComics');
                    continue;
                }

                result.push({ title, link, updated_time, picture_url: match[1] });
            }
            return result;
        });
    }
};
