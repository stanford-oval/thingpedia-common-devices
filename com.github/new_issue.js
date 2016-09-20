// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Andrew Lim <alim16@stanford.edu>
//                Xiangyu Yue <xyyue@stanford.edu>
//
// See LICENSE for details

const Source = require('./source');

const POLL_INTERVAL = 60 * 1000; // 1m

module.exports = Source('issues', 'IssuesEvent', POLL_INTERVAL, function(payload, params) {
    if (payload.action !== 'opened')
        return;

    this.emitEvent([this._params[0], payload.issue.user.login, payload.issue.number, payload.issue.title,
                    payload.issue.body, new Date(payload.issue.created_at)]);
}, function(event, hint, formatter) {
    var repoName = event[0];
    var from = event[1];
    var number = event[2];
    var title = event[3];
    var body = event[4];
    var date = event[5];

    switch (hint) {
    case 'string-title':
        return "Issue @%d opened in %s".format(number, repoName);
    case 'string-body':
        return "%s.\n%s\n.Author: %s".format(title, body, from);
    default:
        return "Issue @%d opened in %s by %s: %s".format(number, repoName, from, title);
    }
});
