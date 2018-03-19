// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingPedia
//
// Copyright 2016 Elena Kane Frey <ekfrey@stanford.edu>
//                Meredith Grace Marks <mgmarks@stanford.edu>,
//
// See LICENSE for details

const Tp = require('thingpedia');

module.exports = new Tp.ChannelClass({
    Name: "FacebookPostsSinkAction",
    Extends: Tp.SimpleAction,

    _doInvoke: function(text) {

    }
});
