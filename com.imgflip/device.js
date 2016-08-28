// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

module.exports = new Tp.DeviceClass({
    Name: 'ImgflipDevice',

    _init: function(engine, state) {
        this.parent(engine, state);
        this.uniqueId = 'com.imgflip';
        this.name = "imgflip Meme Generator";
        this.description = "The Dankest Memes on the Internet, directly in your Sabrina";
    },
});
