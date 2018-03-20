// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Jia-Han Chiam <jiahan@stanford.edu>
//           2016-2018 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

module.exports = class RedditFrontpageDevice extends Tp.BaseDevice {
    constructor(engine, state) {
         super(engine, state);

         this.uniqueId = "com.reddit.frontpage";

         this.name = "Reddit Front Page";
         this.description = "Reddit Front Page watches for posts that reach the front page on Reddit.";
    }

    get_get(params, filter) {
        let url;

        /* FIXME filters
        if (params[2] !== null && params[2] !== undefined) {
            url = 'https://www.reddit.com' + params[2] + '/.rss';
            this.filterString = 'user-' + params[2];
        } else if (params[3] !== null && params[3] !== undefined) {
            url = 'https://www.reddit.com' + params[3] + '/.rss';
            this.filterString = 'category-' + params[3];
        } else {
            // #nofilter
            url = 'https://www.reddit.com/.rss';
        }*/

        url = 'https://www.reddit.com/.rss';

        return Tp.Helpers.Http.get(url).then(Tp.Helpers.Xml.parseString).then((parsed) => {
            let result = [];
            for (let entry of parsed.feed.entry) {
                let updated = new Date(entry.updated[0]);
                let title = entry.title[0]._ || entry.title[0];
                let link = entry.link[0].$.href;
                let user = entry.author[0].name[0];
                if (user.startsWith('/u/'))
                    user = user.substring(3);
                let category = entry.category[0].$.term;
                result.push({ title, link, updated, user, category });
            }

            result.sort((a, b) => (+b.updated_time) - (+a.updated_time));
            return result;
        });
    }
};