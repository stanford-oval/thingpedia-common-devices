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

        this.url = 'https://www.reddit.com/.rss';
    },

    _emit(title, link, entry) {
        this.emitEvent([title, link, entry.author[0].name[0], entry.category[0].$.label]);
    }
});
