// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Andrew Lim <alim16@stanford.edu>
//                Xiangyu Yue <xyyue@stanford.edu>
//
// See LICENSE for details

const Source = require('./source');
const Url = require('url');

const POLL_INTERVAL = 60 * 1000; // 1m

module.exports = Source('issue_comment', 'IssueCommentEvent', POLL_INTERVAL, function(payload, params) {
    if (payload.action !== 'created')
        return;

    this.emitEvent([this._params[0], payload.comment.user.login, payload.issue.number, payload.comment.body, new Date(payload.comment.created_at)]);
}, function(event) {
    var repoName = event[0];
    var from = event[1];
    var number = event[2];
    var body = event[3];
    var date = event[4];

    return "%s commented on issue @%d in %s: %s".format(from, number, repoName, body);
});
