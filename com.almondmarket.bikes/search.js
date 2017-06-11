// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2017 Silei Xu <silei@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');
const URL = 'https://colby.stanford.edu/main/api/bikes/';

module.exports = new Tp.ChannelClass({
    Name: 'SearchBikePosts',

    _init: function _init(engine, device) {
        this.parent();
        this._device = device;
        this.url = URL;
    },

    formatEvent: function formatEvent(event, filters) {
        // event[0]: filters except price, event[1]: price, event[2]: post_id, event[3]: title
        if (event[0] === 400)
            return ['Sorry, I don\'t understand.'];
        if (event[0] === 404)
            return ['Sorry, I couldn\'t find any bike meets your requirements'];
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

    invokeQuery: function invokeQuery(filters, env) {
        // filters[0]: filters except price, filter[1]: price
        var url = this.url;
        if (filters[0]) {
            if (filters[0].indexOf('=') === -1)
                url += '?query=' + filters[0].split(' ').join('+');
            else
                url += '?info=' + filters[0].split(' ').join('+');
        }
        return Tp.Helpers.Http.get(url).then((data) => {
            var response = JSON.parse(data);
            // sempre score too low
            if (response.objects[0] === 400)
                return [[400]];
            // found no match
            if (Object.keys(response.objects[0]).length === 0)
                return [[404]];
            var posts = response.objects;
            var res = [];
            Object.keys(posts[0]).forEach((key) => {
                var post = posts[0][key];
                res.push([filters[0], parseInt(post.price), post.id, post.title]);
            });
            return res;
        });
    }
});
