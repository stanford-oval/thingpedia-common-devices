// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2017 Silei Xu <silei@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');
const URL = 'https://colby.stanford.edu/main/api/bikes/';

module.exports = new Tp.ChannelClass({
    Name: 'MonitorNewBikePosts',
    Extends: Tp.HttpPollingTrigger,
    RequiredCapabilities: ['channel-state'],

    _init: function(engine, state, device, params) {
        this.parent();
        this.state = state;
        this._device = device;

        this._params = params;
        this.interval = 10000;
        this.url = URL;
        if (this._params[0])
            this.url += '?info=' + this._params[0];
        //params[1]: price

        this.postsViewed = null;
    },

    formatEvent: function(event) {
        return [
            '%s for $%s'.format(event[3], event[1]),
            {
                type: 'button',
                text: 'Get details',
                json: '{"query":{"name":{"id":"tt:almond_bike_market.detail"},' +
                '"args":[{"name":{"id":"tt:param.id"},"type":"String","value":{"value":"%s"},"operator":"is"}],'.format(event[2]) +
                '"slots":[]}}'
            },
            {
                type: 'button',
                text: 'Ask a question',
                json: '{"query":{"name":{"id":"tt:almond_bike_market.ask"},' +
                '"args":[{"name":{"id":"tt:param.id"},"type":"String","value":{"value":"%s"},"operator":"is"}],'.format(event[2]) +
                '"slots":[]}}'
            }
        ];
    },

    _onResponse: function(data) {
        var response = JSON.parse(data);
        var posts = response.objects;
        this.postsViewed = this.state.get('posts-viewed');
        Object.keys(posts[0]).forEach((key) => {
            var post = posts[0][key];
            if(this.postsViewed === undefined || this.postsViewed.indexOf(post.id) < 0) {
                if (this.postsViewed === undefined)
                    this.state.set('posts-viewed', [post.id]);
                else {
                    var viewed = this.state.get('posts-viewed');
                    viewed.push(post.id);
                    this.state.set('posts-viewed', viewed);
                }
                this.emitEvent([[this._params[0], parseInt(post.price), post.id, post.title]]);
            }
        });
    }
});

