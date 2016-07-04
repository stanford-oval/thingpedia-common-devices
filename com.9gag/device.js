// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const Tp = require('thingpedia');

module.exports = new Tp.DeviceClass({
    Name: 'NineGagDevice',

    _init: function(engine, state) {
        this.parent(engine, state);
        this.uniqueId = 'com.9gag';
        this.name = "9Gag";
        this.description = "Gets you the latest fun on 9gag";
    },
});
