// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Jia-Han Chiam <jiahan@stanford.edu>
//                Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

module.exports = new Tp.DeviceClass({
    Name: "RedditFrontpageDevice",

    _init(engine, state) {
         this.parent(engine, state);

         this.uniqueId = "com.reddit.frontpage";

         this.name = "Reddit Front Page";
         this.description = "Reddit Front Page watches for posts that reach the front page on Reddit.";
    }
});
