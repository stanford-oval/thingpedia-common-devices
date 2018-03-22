// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Mike Precup <mprecup@cs.stanford.edu>
//                Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

const URL = 'http://thecatapi.com/api/images/get?api_key=MTAxNzA1&format=xml&type=jpg,png';

module.exports = class CatAPIDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);

        this.uniqueId = 'com.thecatapi';
        this.name = "The Cat API";
        this.description = "Where every day is Caturday!";
    }

    get_get({ count }) {
        // fetch 1 cat by default
        count = count || 1;
        const url = URL + '&results_per_page=' + count;
        return Tp.Helpers.Http.get(url).then((result) => Tp.Helpers.Xml.parseString(result))
        .then((parsed) => {
            const array = parsed.response.data[0].images[0].image;
            return array.map((image) => {
                return { image_id: image.id[0], count: array.length, picture_url: image.url[0], link: image.source_url[0] };
            });
        });
    }
};
