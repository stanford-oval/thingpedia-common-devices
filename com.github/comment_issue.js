// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Andrew Lim <alim16@stanford.edu>
//                Xiangyu Yue <xyyue@stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

module.exports = new Tp.ChannelClass({
    Name: 'GithubCommentOnIssueChannel',

    _init: function(engine, device) {
        this.parent();
        this._device = device;
    },

    sendEvent: function(event) {
        var repoName = event[0];
        if (repoName.indexOf('/') < 0)
            repoName = this._device.userName + '/' + this._repoName;

        var number = event[1];
        var body = event[2];
        var auth = "token " + this._device.accessToken;
        var userAgent = 'ThingEngine-Github-Interface';
        Tp.Helpers.Http.post('https://api.github.com/repos/' + repoName + '/issues/' + number + '/comments',
                             JSON.stringify({ body: body }),
                             { auth: auth,
                               'user-agent': userAgent});
        // ignore errors
    },
});
