// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Christopher Salvarani <csal@stanford.edu>
//                Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');
const xml2js = require('xml2js');

const XKCD_RSS_URL = 'http://www.xkcd.com/atom.xml';

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
    Name: 'NewComicTrigger',
    RequiredCapabilities: ['channel-state'],

    _init: function(engine, state, device) {
        this.parent();
        this._state = state;
        this._timeout = null;
    },

    _nextPollingTime() {
        // figure out the next polling time
        // we poll 5 minutes after midnight UTC
        // on monday, wednesday, friday
        // (that's when xkcd comes out)

        var polltime = new Date();
        // round to the next 5 minutes after midnight
        var hour = polltime.getUTCHours();
        var minutes = polltime.getUTCMinutes();
        if (hour > 0 || minutes > 5)
            polltime.setUTCDate(polltime.getUTCDate()+1);
        polltime.setUTCHours(0, 5, 0);

        var now = new Date();
        // always wait at least 5 seconds
        var diff = Math.max(polltime.getTime() - now.getTime(), 5000);
        return diff;
    },

    _onTimeout() {
        this._pollNow().done();
        this._timeout = setTimeout(this._onTimeout.bind(this), this._nextPollingTime);
    },

    _doOpen() {
        this._timeout = setTimeout(this._onTimeout.bind(this), this._nextPollingTime);
        return this._pollNow();
    },

    _doClose() {
        clearTimeout(this._timeout);
        this._timeout = null;
    },

    _pollNow() {
        return Tp.Helpers.Http.get(XKCD_RSS_URL).then((data) => {
            return this._onResponse(data);
        }).catch((e) => {
            console.error('Failed to poll XKCD: ' + e.message);
        });
    },

    formatEvent(event) {
        var number = event[0];
        var link = 'http://xkcd.com/' + number;
        var title = event[1];
        var picture = event[2];
        var alt = event[3];

        return [title, { type: 'picture', url: picture }, alt, link];
    },

    _onResponse(data) {
        var state = this._state;

        return parseXml(data).then((parsed) => {
            var updated = parsed.feed.updated[0];
            // note: this is comparing dates as strings
            // it works because dates are in ISO format
            // note 2: this relies on state.get() returning undefined
            // when not set, and undefined becoming NaN with <=
            // anything <= NaN is false (including NaN <= NaN)
            // so this works
            // if you flip the condition to say (!(update > state.get('updated')))
            // stuff breaks
            if (updated <= state.get('updated'))
                return;

            var top = parsed.feed.entry[0];
            if (top === undefined)
                return;

            state.set('updated', updated);
            var title = top.title[0];
            var link = top.link[0].$.href;

            var match = /http:\/\/xkcd\.com\/([0-9]+)\/?/.exec(link);
            var number = parseInt(match[1]);
            var summary = top.summary[0]._;
            return parseXml(summary).then((parsedSummary) => {
                var picture = parsedSummary.img.$.src;
                var alt = parsedSummary.img.$.alt;

                return this.emitEvent([number, title, picture, alt]);
            });
        });
    },
});
