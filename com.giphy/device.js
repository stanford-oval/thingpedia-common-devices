// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Silei Xu <silei@stanford.edu>
//
// See COPYING for details

const Tp = require('thingpedia');

module.exports = new Tp.DeviceClass({
    Name: 'Giphy',

    _init: function(engine, state) {
        this.parent(engine, state);
        this.uniqueId = 'com.giphy';
        this.name = "Giphy";
        this.description = "A GIF a day keeps the doctor away.";
    }
});
