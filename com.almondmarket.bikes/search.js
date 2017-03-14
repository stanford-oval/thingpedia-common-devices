// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2017 Silei Xu <silei@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');
const URL = 'https://colby.stanford.edu/api/bikes/';

module.exports = new Tp.ChannelClass({
    Name: 'SearchBikePosts',

    _init: function(engine, device) {
        this.parent();
        this._device = device;
        this.url = URL;
    },

    formatEvent: function(event, filters) {
        return '%s %s %s bike for $%f, contact %s (%s) for details'.format(
            event[0], event[1], event[2], event[4], event[5], event[6]
        );
    },

    invokeQuery: function(filters) {
        var url = this.url;
        return Tp.Helpers.Http.get(url).then((data) => {
            var response = JSON.parse(data);

            var posts = response.objects;
            return posts.map((post) => {
                return [
                    post.brand,
                    post.model,
                    post.gender,
                    post.size,
                    post.price,
                    post.poster,
                    post.phone
                ];
            });
         });
    },
});
