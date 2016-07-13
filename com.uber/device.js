// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Juan Vimberg <jvimberg@stanford.edu>
//                Tucker L. Ward <tlward@stanford.edu>
//                Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const Tp = require('thingpedia');

module.exports = new Tp.DeviceClass({
    Name: "UberDeviceClass",

    _init: function(engine, state) {
        this.parent(engine, state);

        this.uniqueId = 'com.uber';
        this.name = "Uber";
        this.description = "Query times and availability of Uber services.";
    }
});
