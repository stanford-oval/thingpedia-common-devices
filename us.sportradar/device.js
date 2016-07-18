// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//           2016 Riad S. Wahby <rsw@cs.stanford.edu> - extended with additional sports
//
// See LICENSE for details

const Tp = require('thingpedia');

module.exports = new Tp.DeviceClass({
    Name: 'SportRadarDevice',

    _init: function(engine, state) {
        this.parent(engine, state);

        this.uniqueId = 'us.sportradar';
        this.name = "SportRadar";
        this.description = "SportRadar is a quick source of Sport Results and info and stuff. Supports NFL, NBA, European and USA Soccer, MLB, NCAAFB, and NCAAMBB.";
    }
});
