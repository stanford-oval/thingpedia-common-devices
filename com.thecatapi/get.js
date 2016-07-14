// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Mike Precup <mprecup@cs.stanford.edu>
//                Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');
const xml2js = require('xml2js');

const URL = 'http://thecatapi.com/api/images/get?api_key=MTAxNzA1&format=xml&type=jpg,png';

module.exports = new Tp.ChannelClass({
    Name: 'CatAPIGetChannel',

    _init: function(engine, device, params) {
        this.parent();
        this.device = device;
    },

    formatEvent: function(event, filters) {
        return [{ type: 'picture', url: event[2] }];
    },

    invokeQuery: function(filters) {
        var imageId = filters[0];
        var count = filters[1];

        var url = URL;
        if (imageId !== undefined && imageId !== null)
            url += '&image_id=' + encodeURIComponent(imageId);
        if (count !== undefined && count !== null)
            url += '&results_per_page=' + encodeURIComponent(count);
        else
            url += '&results_per_page=1'; // fetch 1 cat by default

        return Tp.Helpers.Http.get(url).then(function(result) {
            return new Promise(function(callback, errback) {
                xml2js.parseString(result, function(err, res) {
                    if (err)
                        errback(err);
                    else
                        callback(res);
                });
            });
        }).then(function(parsed) {
            var array = parsed.response.data[0].images[0].image;
            return array.map(function(image) {
                return [image.id[0], array.length, image.url[0], image.source_url[0]];
            });
        });
    },
});
