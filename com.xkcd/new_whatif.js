// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Christopher Salvarani <csal@stanford.edu>
//                Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');
const xml2js = require('xml2js');

const POLL_INTERVAL_MS = 1000 * 60 * 60 * 24; // 1 day
const WHATIF_URL = 'http://what-if.xkcd.com/feed.atom';

function parseXml(data) {
    return new Promise(function(callback, errback) {
        xml2js.parseString(data, function(err, res) {
            if (err)
                errback(err);
            else
                callback(res);
        });
    });
}

module.exports = new Tp.ChannelClass({
    Name: 'NewWhatIfTrigger',
    Extends: Tp.HttpPollingTrigger,
    RequiredCapabilities: ['channel-state'],
    interval: POLL_INTERVAL_MS,

    _init(engine, state, device) {
        this.parent();
        this._state = state;
        this.url = WHATIF_URL;
    },

    formatEvent(event) {
        var title = event[0];
        var link = event[1];

        return [{ type: 'rdl',
            what: 'post',
            displayTitle: "What If",
            displayText: title,
            callback: link,
            webCallback: link }];
    },

    _onResponse(data) {
        var state = this._state;

        return parseXml(data).then((parsed) => {
            var newest = undefined;
            var lastRead = state.get('last-read');

            var toEmit = [];
            for (var entry of parsed.feed.entry) {
                var updated = entry.updated[0];
                // pay attention to correct NaN handling
                if (!(updated <= newest))
                    newest = updated;
                if (updated <= lastRead)
                    continue;
                toEmit.push(entry);
            }

            toEmit.sort(function(a, b) {
                return +Date.parse(a.updated[0]) - +Date.parse(b.updated[0]);
            });

            state.set('last-read', newest);
            for (var entry of toEmit)
                this.emitEvent([entry.title[0], entry.link[0]]);
        });
    }
});
