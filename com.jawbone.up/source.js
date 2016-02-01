// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const Tp = require('thingpedia');

module.exports = function(what, interval, formatter) {
    return new Tp.ChannelClass({
        Name: 'JawboneChannel' + what,
        Extends: Tp.HttpPollingTrigger,
        RequiredCapabilities: ['channel-state'],
        interval: interval,

        _init: function(engine, state, device) {
            this.parent();
            this.device = device;
            this._state = state;

            this._baseurl = 'https://jawbone.com/nudge/api/v.1.1/users/@me/' + what;
            this.url = this._baseurl;
        },

        get auth() {
            return "Bearer " + this.device.accessToken;
        },

        _doOpen: function() {
            // This does not seem to actually work (always returns no
            // data), so let's skip this optimization for now
            //var lastRead = this._state.get('last-read');
            //if (lastRead !== undefined)
            //    this.url += '?updated_after=' + lastRead;

            return this.parent();
        },

        _onResponse: function(response) {
            var state = this._state;

            var parsed;
            try {
                parsed = JSON.parse(response);
            } catch(e) {
                console.log('Error parsing Jawbone server response: ' + e.message);
                console.log('Full response was');
                console.log(response);
                return;
            }

            if (parsed.data.items.length === 0)
                return;

            var lastRead = state.get('last-read');
            if (lastRead === undefined) {
                lastRead = parsed.data.items[0].time_updated;
                state.set('last-read', lastRead);
            }

            if (parsed.data.items[0].time_updated <= lastRead) {
                if (this.event === null) {
                    this.emitEvent(formatter(parsed.data.items[0]));
                } else {
                    return;
                }
            } else {
                state.set('last-read', parsed.data.items[0].time_updated);
                //this.url = this._baseurl + '?updated_after=' + parsed.data.items[0].time_updated;
            }

            // find the last reading that we knew about
            for (var i = 0; i < parsed.data.items.length; i++) {
                if (parsed.data.items[i].time_updated <= lastRead)
                    break;
            }

            // then emit an event for each new data point
            // (note we reuse i from the previous loop!)
            for (; i >= 0; i--)
                this.emitEvent(formatter(parsed.data.items[i]));
        }
    });
}


