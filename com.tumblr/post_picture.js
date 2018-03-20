// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

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
        var caption = event[0];
        var url = event[1];

        if (Tp.Helpers.Content.isPubliclyAccessible(url)) {
            return Q.ninvoke(this._oauth, 'post', this.url, this.device.accessToken, this.device.accessTokenSecret,
                { type: 'photo',
                  caption: caption,
                  source: url
                }).catch((e) => {
                    console.error('Failed to upload picture to Tumblr', e);
                    throw e;
                });
        } else {
            return Tp.Helpers.Content.getData(this.engine.platform, url).then((buffer) => {
                return Q.ninvoke(this._oauth, 'post', this.url, this.device.accessToken, this.device.accessTokenSecret,
                    { type: 'photo',
                      caption: caption,
                      data64: buffer.toString('base64')
                    });
            }).catch((e) => {
                console.error('Failed to upload picture to Tumblr', e);
                throw e;
            });
        }
    },
});
