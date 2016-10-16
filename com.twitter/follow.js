// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2015 Giovanni Campagna
//

const Tp = require('thingpedia');

module.exports = new Tp.ChannelClass({
    Name: 'TwitterFollowChannel',

    _init: function(engine, device) {
        this.parent();

        this._twitter = device.queryInterface('twitter');
    },

    sendEvent: function(event) {
        console.log('Following Twitter user', event);

        var username = event[0];
        return new Promise((callback, errback) => {
            return this._twitter.postCreateFriendship({ screen_name: username, follow: 'true' }, errback, callback);
        }).catch((e) => {
            if (e.statusCode && e.data) {
                // OAuth.js style error
                if (e.statusCode === 403) {
                    // duplicate friendship, eat the error
                    return;
                }

                console.error('Unexpected HTTP error', data);
                throw new Error('Unexpected HTTP error ' + e.statusCode);
            } else {
                throw e;
            }
        });
    },
});
