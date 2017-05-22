// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2017 Silei Xu <silei@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');
const URL = 'https://colby.stanford.edu/main/api/dates/';

module.exports = new Tp.ChannelClass({
    Name: 'SearchDatePosts',

    _init: function(engine, device) {
        this.parent();
        this._device = device;
        this.url = URL;
    },

    formatEvent: function(event, filters) {
        return 'New post found: %s need partner for %s: %s, %s'.format(
            event[2], event[0], event[1], event[3]
        );
    },

    invokeQuery: function(filters) {
        var url = this.url;
        return Tp.Helpers.Http.get(url).then((data) => {
            var response = JSON.parse(data);

            var posts = response.objects;
            return posts.map((post) => {
                return [
                    post.interest,
                    post.message,
                    post.poster,
                    post.phone
                ];
            });
         });
    },
});
