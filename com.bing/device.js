// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

module.exports = new Tp.DeviceClass({
    Name: 'BingDevice',

    _init: function(engine, state) {
        this.parent(engine, state);
        this.uniqueId = 'com.bing';
        this.name = "Bing Search";
        this.description = "Search the web, using Bing";
    },
});
