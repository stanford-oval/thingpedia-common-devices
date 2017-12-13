// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Shloka Desai <shloka@stanford.edu>
//                Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Q = require('q');
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
    Name: 'WashingPostNewArticleTrigger',
    Extends: Tp.HttpPollingTrigger,
    RequiredCapabilities: ['channel-state'],
    interval: 3 * 3600 * 1000, // 3 hours

    _init: function(engine, state, device, params) {
        this.parent(engine, state, device);
        this.device = device;
        this._state = state;

        this.section = params[0];
        if (!this.section)
            throw new Error('Missing required parameter');
        this.url = SECTIONS[this.section];
        this.filterString = this.section;
    },

    formatEvent(event) {
        var section = event[0];
        var title = event[1];
        var link = event[2];
        var description = event[3];

        return [{ type: 'rdl',
            displayTitle: title,
            displayText: description,
            callback: link,
            webCallback: link
        }];
    },

    _onResponse(response) {
        var state = this._state;

        return Tp.Helpers.Xml.parseString(response).then((parsed) => {
            // the articles in the feed are not sorted in any meaningful way, so we keep a list
            // of guids we have already seen
            // for performance, we only keep one full feed worth of uuids, assuming that if something
            // is taken off it won't reappear again
            var alreadyRead = state.get('already-read') || [];
            var readSet = new Set(alreadyRead);
            var newReadSet = [];

            var toEmit = [];
            for (var entry of parsed.rss.channel[0].item) {
                //console.log('RSS item ' + entry.title[0] + ' updated on ' + entry.pubDate[0]);
                //console.log('entry', entry);

                var guid = entry['guid'][0];
                newReadSet.push(guid);
                if (readSet.has(guid))
                    continue;
                toEmit.push(entry);
            }

            state.set('already-read', newReadSet);
            for (var entry of toEmit)
                this.emitEvent([this.section, entry.title[0], entry.link[0], entry.description ? entry.description[0] : '',
                                entry['media:group'] && entry['media:group'][0]['media:content'] ? entry['media:group'][0]['media:content'][2].$.url : '']);
        });
    },

    _doOpen() {
        if (this._timeout)
            throw new Error('Double _doOpen');

        this.startPolling();
        // wait a couple main-loop iterations before
        // checking the rss feed the first time, so that triggers
        // are settled
        setTimeout(function() {
            Q(this._onTick()).done();
        }.bind(this), 500);
    },

    _doClose() {
        this.stopPolling();
        return Q();
    },
});
