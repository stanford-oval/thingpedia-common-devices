// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Shloka Desai <shloka@stanford.edu>
//                Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

const SECTIONS = {
    politics: 'http://feeds.washingtonpost.com/rss/politics',
    opinions: 'http://feeds.washingtonpost.com/rss/opinions',
    local: 'http://feeds.washingtonpost.com/rss/local',
    sports: 'http://feeds.washingtonpost.com/rss/sports',
    national: 'http://feeds.washingtonpost.com/rss/national',
    world: 'http://feeds.washingtonpost.com/rss/world',
    business: 'http://feeds.washingtonpost.com/rss/business',
    lifestyle: 'http://feeds.washingtonpost.com/rss/lifestyle'
}

// Unfortunately, the feeds above do not have pubDate set properly for the articles,
// so we cannot use the generic RSS code

module.exports = new Tp.ChannelClass({
    Name: 'WashingtonPostGetArticleTrigger',

    invokeQuery(filters) {
        let section = filters[0];
        let url = SECTIONS[section];

        return Tp.Helpers.Http.get(url).then((response) => {
            return Tp.Helpers.Xml.parseString(response);
        }).then((parsed) => {
            var toEmit = [];
            for (var entry of parsed.rss.channel[0].item) {
                toEmit.push([section, entry.title[0], entry.link[0], entry.description ? entry.description[0] : '',
                             entry['media:group'] && entry['media:group'][0]['media:content'] ? entry['media:group'][0]['media:content'][2].$.url : '']);
            }

            return toEmit;
        });
    }
});
