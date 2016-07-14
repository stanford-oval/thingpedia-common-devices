// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Mike Precup <mprecup@cs.stanford.edu>
//                Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

module.exports = new Tp.DeviceClass({
    Name: "CatAPIDevice",

    _init: function(engine, state) {
        this.parent(engine, state);

        this.uniqueId = 'com.thecatapi';
        this.name = "The Cat API";
        this.description = "Where every day is Caturday!";
    }
});
