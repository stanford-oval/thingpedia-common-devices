// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Jia-Han Chiam <jiahan@stanford.edu>
//                Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

module.exports = new Tp.ChannelClass({
    Name: 'NewPostTrigger',
    RequiredCapabilities: ['channel-state'],
    Extends: Tp.RSSPollingTrigger,
    interval: 300000, // 5 min

    _init(engine, state, device, params) {
        this.parent(engine, state, device);

        if (params[2] !== null && params[2] !== undefined) {
            // filter by user
            this.url = 'https://www.reddit.com' + params[2] + '/.rss';
            this.filterString = 'user-' + params[2];
        } else if (params[3] !== null && params[3] !== undefined) {
            // filter by category
            this.url = 'https://www.reddit.com' + params[3] + '/.rss';
            this.filterString = 'category-' + params[3];
        } else {
            // #nofilter
            this.url = 'https://www.reddit.com/.rss';
        }
    },

    formatEvent(event) {
        var title = event[0];
        var link = event[1];
        var author = event[2];
        var category = event[3];

        return [{
            type: 'rdl',
            displayTitle: title,
            displayText: "By %s. In %s.".format(author, category),
            callback: link,
            webCallback: link
        }];
    },

    _emit(entry) {
        var title = entry[0];
        var link = entry[1];
        var xml = entry[2];
        var updated = entry[3];
        this.emitEvent([title, link, xml.author[0].name[0], xml.category[0].$.label]);
    }
});
