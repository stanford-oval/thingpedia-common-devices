// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 <ashwinpp@stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

module.exports = new Tp.ChannelClass({
    Name: 'GetLatest',

    _init: function(engine, device) {
        this.parent();
        this._device = device;
    },

    formatEvent: function(event) {
        return [event[0], { type: 'picture', url: event[2] }];
    },

    invokeQuery: function() {
        return Tp.Helpers.Http.get('http://infinigag.k3min.eu/fresh').then((data) => {
            var response = JSON.parse(data);

            var posts = response.data.slice(0, 3);
            return posts.map((post) => {
                return [post.caption, post.link, post.images.large];
            });
         });
    },
});
