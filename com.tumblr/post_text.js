// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Q = require('q');
const Tp = require('thingpedia');

const TUMBLR_POSTS_URL = 'https://api.tumblr.com/v2/blog/%s/post';

module.exports = new Tp.ChannelClass({
    Name: 'TumblrPostAction',

    _init: function(engine, device) {
        this.parent(engine, device);

        this.url = TUMBLR_POSTS_URL.format(this.device.blogId);
        this._oauth = device.queryInterface('tumblr-oauth');
    },

    sendEvent(event) {
        var title = event[0];
        var body = event[1];

        return Q.ninvoke(this._oauth, 'post', this.url, this.device.accessToken, this.device.accessTokenSecret,
            { type: 'text',
              format: 'markdown',
              title: title,
              body: body
            });
    },
});
