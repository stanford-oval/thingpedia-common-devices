// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Jacob Baldwin <jtb5np@stanford.edu>
//                Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

const TUMBLR_POSTS_URL = 'https://api.tumblr.com/v2/blog/%s/posts/text?api_key=%s&filter=text';
const POLL_INTERVAL = 30*60000; // 30 minutes

module.exports = new Tp.ChannelClass({
    Name: 'TumblrNewPosts',
    Extends: Tp.HttpPollingTrigger,
    RequiredCapabilities: ['channel-state'],
	interval: POLL_INTERVAL,

    _init: function(engine, state, device, params) {
        this.parent(engine, state, device);
        this.state = state;

        this._params = params;
        this.filterString = this._params[0];

        this._observedBlog = this._params[0];
        if (!this._observedBlog)
            throw new TypeError('Missing parameter');
        if (this._observedBlog.indexOf('.') < 0)
            this._observedBlog = this._observedBlog + '.tumblr.com';

		this.url = TUMBLR_POSTS_URL.format(this._observedBlog, this.device.constructor.metadata.auth.client_id);
    },

    formatEvent(event, filters) {
        var blog = event[0];
        var date = event[1];
        var title = event[2];
        var post_url = event[3];
        var tags = event[4];
        var body = event[5];

        return [{
            type: 'rdl',
            what: 'post',
            displayTitle: title,
            callback: post_url,
            webCallback: post_url
        }, body];
    },

    _onResponse(response) {
        var parsed = JSON.parse(response);

        var state = this.state;
        var lastRead = this.state.get('last-read');
        var newest = undefined;
        parsed.response.posts.forEach((post) => {
            if (lastRead < post.timestamp)
                return;
            if (post.state !== 'published')
                return;

            if (newest === undefined ||
                newest < post.timestamp)
                newest = post.timestamp;

            this.emitEvent([this._params[0], new Date(post.timestamp), post.title, post.post_url, post.tags, post.body]);
        });
        this.state.set('last-read', newest);
    },
});
