// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2015 Giovanni Campagna
//

const Tp = require('thingpedia');

module.exports = new Tp.ChannelClass({
    Name: 'TwitterSearchByHashtagChannel',

    _init: function(engine, device) {
        this.parent(engine, device);

        this._twitter = device.queryInterface('twitter');
    },

    formatEvent(event, filters, hint) {
        var query = event[0];
        var count = event[1];
        var text = event[2];
        var hashtags = event[3];
        var urls = event[4];
        var from = event[5];
        var inReplyTo = event[6];

        if (hint === 'string-title')
            return "@%s tweeted.".format(from);
        else if (hint === 'string-body')
            return text;
        else
            return '@%s tweeted: %s'.format(from, text);
    },

    _processOneTweet: function(query, count, tweet) {
        var hashtags = [];
        for (var i = 0; i < tweet.entities.hashtags.length; i++) {
            hashtags.push(tweet.entities.hashtags[i].text.toLowerCase());
        }

        var urls = [];
        for (var i = 0; i < tweet.entities.urls.length; i++) {
            urls.push(tweet.entities.urls[i].expanded_url);
        }

        return [query, count, tweet.text, hashtags, urls,
                tweet.user.screen_name.toLowerCase(),
                tweet.in_reply_to_screen_name ? tweet.in_reply_to_screen_name.toLowerCase() : null];
    },

    invokeQuery: function(filters) {
        var query = filters[0];
        if (!query.startsWith('#'))
            query = '#' + filters[0];
        // twitter default is 15, which is a lot
        // let's default to 5 instead
        var count = filters[1] || 5;

        var from = filters[5];
        if (from !== undefined && from !== null)
            query += ' from:' + from;
        var inReplyTo = filters[6];
        if (inReplyTo !== undefined && inReplyTo !== null)
            query += ' to:' + inReplyTo;

        return new Promise((callback, errback) => {
            return this._twitter.getSearch({ q: query, count: count, include_entities: 'true' }, errback, callback);
        }).then((response) => {
            var results = JSON.parse(response).statuses;
            return results.map((r) => this._processOneTweet(filters[0], count, r));
        }).catch(function(e) {
            console.log('Failed to poll Twitter for new data: ' + e);
            console.log(e.stack);
        });
    },
});
