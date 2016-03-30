// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingPedia
//
// Copyright 2016 Elena Kane Frey <ekfrey@stanford.edu>
//                Meredith Grace Marks <mgmarks@stanford.edu>,
//
// See COPYING for details

const Tp = require('thingpedia');

module.exports = new Tp.ChannelClass({
    Name: "FacebookPostsSourceTrigger",
    Extends: Tp.HttpPollingTrigger,
    RequiredCapabilities: ['channel-state'],
    interval: 300000,

    _init: function(engine, state, device, params) {
        this.parent();
        this.device = device;
        this.state = state;

        this._base_url = "https://graph.facebook.com/v2.5/me/feed?fields=message,story,from{name,id}";
        this.url = this._base_url;
    },

    get auth() {
        return 'Bearer ' + this.device.accessToken;
    },

    _doOpen: function() {
        var since = this.state.get('since');
        if (since !== undefined)
            this.url = this._base_url + '&since=' + since;

        return this.parent();
    },

    _onResponse: function(response) {
        response = JSON.parse(response);
        for (var i = response.data.length - 1; i >= 0; i--) {
            var post = response.data[i];
            var msg = post.message ? post.message : post.story;
            this.emitEvent([msg, post.from.name, this.device.profileId == post.from.id]);
        }

        var since = +(new Date);
        this.state.set('since', since);
        this.url = this._base_url + '&since=' + since;
    }
});
