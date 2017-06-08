// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Christopher Salvarani <csal@stanford.edu>
//                Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');
const xml2js = require('xml2js');

const XKCD_RSS_URL = 'https://www.xkcd.com/atom.xml';

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
    Extends: Tp.HttpPollingTrigger,
    RequiredCapabilities: ['channel-state'],

    _init: function(engine, state, device) {
        this.parent(engine, state, device);
        this._state = state;
        this.interval = 24 * 3600 * 1000;
        this.url = XKCD_RSS_URL;
    },

    formatEvent(event) {
        var number = event[0];
        var link = 'https://xkcd.com/' + number;
        var title = event[1];
        var picture = event[2];
        var alt = event[3];

        return [{ type: 'rdl',
            displayTitle: title,
            callback: link,
            webCallback: link
        }, { type: 'picture', url: picture }, alt];
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

            var title = top.title[0];
            var link = top.link[0].$.href;

            var match = /https?:\/\/xkcd\.com\/([0-9]+)\/?/.exec(link);
            var number = parseInt(match[1]);
            var summary = top.summary[0]._;

            state.set('updated', updated);
            return parseXml(summary).then((parsedSummary) => {
                var picture = parsedSummary.img.$.src;
                var alt = parsedSummary.img.$.alt;

                return this.emitEvent([number, title, picture, alt]);
            });
        });
    },
});
