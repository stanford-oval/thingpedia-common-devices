// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Shloka Desai <shloka@stanford.edu>
//                Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

module.exports = new Tp.ChannelClass({
    Name: 'GenericRSSPollingTrigger',
    Extends: Tp.RSSPollingTrigger,
    RequiredCapabilities: ['channel-state'],
    interval: 3 * 3600 * 1000, // 3 hours

    _init: function(engine, state, device) {
        this.parent(engine, state, device);
        this.url = this.device.url;
    },

    formatEvent(event) {
        var title = event[0];
        var link = event[1];
	var img = event[2];

        return [title, {
            type: 'picture',
	    url: img	
        }];
    },

    _emit(entry) {
        var title = entry[0];
        var link = entry[1];
        var xml = entry[2];
        var updated = entry[4];
	
        var regex = /<img.+src="([^"]+)"/g;
        var match = regex.exec(xml);
        if (match === null) {
            console.error('Failed to scrape PhdComics');
            return;
        }

        var img = match[0];
        this.emitEvent([title, link, img]);
    }
});
