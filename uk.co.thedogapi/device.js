// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Mike Precup <mprecup@cs.stanford.edu>
//                Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

module.exports = class DogApiDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);

        this.uniqueId = 'co.uk.thedogapi';
        this.name = "The Dog API";
        this.description = "Random Doggo Pictures";
    }
};
