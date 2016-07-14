// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Shloka Desai <shloka@stanford.edu>
//                Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const Tp = require('thingpedia');

module.exports = new Tp.DeviceClass({
    Name: "RSSDevice",

    _init: function(engine, state) {
         this.parent(engine, state);

         this.uniqueId = 'org.thingpedia.rss-' + this.url;
         this.name = "RSS Feed at " + this.url;
         this.description = "This is a RSS Feed";
    },

    get url() {
        return this.state.url;
    }
});
