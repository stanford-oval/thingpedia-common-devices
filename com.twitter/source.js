// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2015-2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');
const Q = require('q');

const SourceBase = require('./source_base');

module.exports = SourceBase(false, function(event, hint) {
    var text = event[0];
    var hashtags = event[1];
    var urls = event[2];
    var from = event[3];
    var inReplyTo = event[4];

    if (hint === 'string-title')
        return "@%s tweeted.".format(from);
    else if (hint === 'string-body')
        return text;
    else
        return '@%s tweeted: %s'.format(from, text);
}, function(tweet, hashtags, urls) {
    var event = [tweet.text,
                 hashtags,
                 urls,
                 tweet.user.screen_name,
                 tweet.in_reply_to_screen_name,
                 false]; // for compat
    this.emitEvent(event);
});
