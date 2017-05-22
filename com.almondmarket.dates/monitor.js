// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2017 Silei Xu <silei@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');
const URL = 'https://colby.stanford.edu/main/api/dates/';

module.exports = new Tp.ChannelClass({
    Name: 'MonitorNewDatePosts',
    Extends: Tp.HttpPollingTrigger,
    RequiredCapabilities: ['channel-state'],

    _init: function(engine, state, device, params) {
        this.parent();
        this.state = state;
        this._device = device;

        this.interval = 10000;
        this.url = URL;
        this.postsViewed = null;
    },

    formatEvent: function(event) {
        return 'New post found: %s need partner for %s: %s, %s'.format(
            event[2], event[0], event[1], event[3]
        );
    },

    _onResponse: function(data) {
        var response = JSON.parse(data);
        var posts = response.objects;
        this.postsViewed = this.state.get('posts-viewed');
        posts.map((post) => {
            if(this.postsViewed === undefined || this.postsViewed.indexOf(post.id) < 0) {
                if (this.postsViewed === undefined)
                    this.state.set('posts-viewed', [post.id]);
                else {
                    var viewed = this.state.get('posts-viewed');
                    viewed.push(post.id);
                    this.state.set('posts-viewed', viewed);
                }
                this.emitEvent([
                    post.interest,
                    post.message,
                    post.poster,
                    post.phone
                ]);
            }
        });
    }
});

