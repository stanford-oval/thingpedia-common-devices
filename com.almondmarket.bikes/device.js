// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2017 Silei Xu <silei@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

module.exports = new Tp.DeviceClass({
    Name: 'AlmondMarketBikeDevice',

    _init: function(engine, state) {
        this.parent(engine, state);
        this.uniqueId = 'com.almondmarket.bikes';
        this.name = "Almond Bike Market";
        this.description = "Sell and Buy 2nd hand bikes.";
    },
});
