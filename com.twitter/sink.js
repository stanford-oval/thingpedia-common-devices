// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2015 Giovanni Campagna
//

const Tp = require('thingpedia');

module.exports = new Tp.ChannelClass({
    Name: 'TwitterSinkChannel',

    _init: function(engine, device) {
        this.parent();

        this._twitter = device.queryInterface('twitter');
    },

    sendEvent: function(event) {
        console.log('Posting Twitter event', event);

        var status = event[0];
        if (status.length > 140)
            status = status.substr(0, 139) + '…';

        return new Promise((callback, errback) => {
            return this._twitter.postTweet({ status: status }, errback, callback);
        }).catch((e) => {
            if (e.message && (!e.data && !e.errors))
                throw e;

            console.error('Failed to post tweet', e);
            if (e.data && e.data)
                throw new Error(JSON.parse(e.data).errors[0].message);
            else if (e.errors)
                throw new Error(e.errors[0].message);
            else
                throw new Error(String(e));
        });
    },
});
