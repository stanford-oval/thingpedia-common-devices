// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 <ashwinpp@stanford.edu>
//
// See COPYING for details

const Tp = require('thingpedia');

module.exports = new Tp.ChannelClass({
    Name: 'FreshPostChannel',
    Extends: Tp.HttpPollingTrigger,
    RequiredCapabilities: ['channel-state'],

    _init: function(engine, state, device, params) {
        this.parent();
        this.state = state;
        this.interval = 10000;

        this.url = 'http://infinigag.k3min.eu/fresh';

        this.lastPost = null;
        this.lastPostId = null;
        this._device = device;
    },

    formatEvent: function(event) {
        return [event[0], { type: 'picture', url: event[2] }];
    },

    _onResponse: function(data) {
        var x = JSON.parse(data);

        var lastPostId = this.state.get('last-post-id');
        if (lastPostId === undefined || x.data[0].id !== lastPostId) {
            this.state.set('last-post-id', x.data[0].id);

            var post = x.data[0];
            this.emitEvent([post.caption, post.link, post.images.large]);
        }
    }
});

