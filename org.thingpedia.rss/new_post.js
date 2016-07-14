// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Shloka Desai <shloka@stanford.edu>
//                Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');
const xml2js = require('xml2js');

module.exports = new Tp.ChannelClass({
    Name: 'RSSPollingTrigger',
    Extends: Tp.HttpPollingTrigger,
    RequiredCapabilities: ['channel-state'],
    interval: 3 * 3600 * 1000, // 3 hours

    _init: function(engine, state, device) {
        this.parent();
        this.device = device;
        this._state = state;

        this.url = this.device.url;
    },

    formatEvent(event) {
        var title = event[0];
        var link = event[1];

        return [{
            type: 'rdl',
            what: 'post',
            displayTitle: title,
            callback: link,
            webCallback: link
        }];
    },

    _onResponse(response) {
        var state = this._state;
        var lastRead = state.get('last-read');

        return new Promise((callback, errback) => {
            xml2js.parseString(response, (err, res) => {
                if (err)
                    errback(err);
                else
                    callback(res);
            });
        }).then((parsed) => {
            var newest = undefined;

            var toEmit = [];
            if (parsed.feed) {
                for (var entry of parsed.feed.entry) {
                    var updated = +new Date(entry.updated[0]);
                    if (newest === undefined ||
                        newest < updated)
                        newest = updated;
                    if (updated <= lastRead)
                        continue;
                    toEmit.push([entry.title[0], entry.link[0].$.href, updated]);
                }
            } else {
                for (var entry of parsed.rss.channel[0].item) {
                    var updated = +new Date(entry.pubDate[0]);
                    if (newest === undefined ||
                        newest < updated)
                        newest = updated;
                    if (updated <= lastRead)
                        continue;
                    toEmit.push([entry.title[0], entry.link[0], updated]);
                }
            }

            toEmit.sort(function(a, b) {
                return a[2] - b[2];
            });

            state.set('last-read', newest);
            for (var entry of toEmit)
                this.emitEvent([entry[0], entry[1]]);
        });
    }
});
