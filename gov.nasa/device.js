// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Victor Kaiser-Pendergrast <vkpend@stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

module.exports = new Tp.DeviceClass({
    Name: 'NasaDevice',

    _init: function(engine, state) {
        this.parent(engine, state);

        this.uniqueId = 'gov.nasa';
        this.name = 'NASA Public Data';
        this.description = 'Get access to publicly available images and data from NASA';
    },

    checkAvailable: function() {
        return Tp.Availability.AVAILABLE;
    }
});
