// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Mike Precup <mprecup@cs.stanford.edu>
//                Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

const URL = 'https://api.thedogapi.co.uk/v2/dog.php?limit=';

module.exports = class DogApiDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);

        this.uniqueId = 'co.uk.thedogapi';
        this.name = "The Dog API";
        this.description = "Random Doggo Pictures";
    }

    get_get({ count }) {
        var url = URL + count;
        return Tp.Helpers.Http.get(url).then((result) => {
            const parsed = JSON.parse(result);
            const array = parsed.data;
            return array.map((image) => {
                return { image_id: image.id, picture_url: image.url };
            });
        });
    }
};
