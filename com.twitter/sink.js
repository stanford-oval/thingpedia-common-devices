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
        return new Promise((callback, errback) => {
            return this._twitter.postTweet({ status: status }, errback, callback);
        });
    },
});
