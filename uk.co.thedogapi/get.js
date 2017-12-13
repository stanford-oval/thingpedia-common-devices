// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Mike Precup <mprecup@cs.stanford.edu>
//                Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

const URL = 'https://api.thedogapi.co.uk/v2/dog.php?limit=';

module.exports = class DogApiGetChannel extends Tp.BaseChannel {
    formatEvent(event, filters) {
        return [{ type: 'picture', url: event[2] }];
    }

    invokeQuery(filters) {
        var count = filters[0] || 1;

        var url = URL + count;
        return Tp.Helpers.Http.get(url).then(function(result) {
            var parsed = JSON.parse(result);
            var array = parsed.data;
            return array.map(function(image) {
                return [filters[0], image.id, image.url];
            });
        });
    }
}
