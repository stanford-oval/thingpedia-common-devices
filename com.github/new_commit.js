// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Andrew Lim <alim16@stanford.edu>
//                Xiangyu Yue <xyyue@stanford.edu>
//
// See LICENSE for details

const Source = require('./source');

const POLL_INTERVAL = 60 * 1000; // 1m

module.exports = Source('push', 'PushEvent', POLL_INTERVAL, function(payload, params) {
    for (var commit of payload.commits) {
        this.emitEvent([this._params[0], commit.author.username || commit.author.email, commit.message,
            new Date(commit.timestamp)]);
    }
}, function(event, hint, formatter) {
    var repoName = event[0];
    var from = event[1];
    var message = event[2];
    var date = event[3];

    switch (hint) {
    case 'string-title':
        return "New commit in %s".format(repoName);
    case 'string-body':
        return "%s.\nAuthor: %s".format(message, from);
    default:
        return "New commit in %s by %s: %s".format(repoName, from, message);
    }
});
