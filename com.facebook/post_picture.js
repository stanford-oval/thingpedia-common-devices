// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingPedia
//
// Copyright 2016 Lingxiao Li <csimstu@stanford.edu>
//                Kaidi Yan <kaidi@stanford.edu>
//
// See LICENSE for details

var Tp = require('thingpedia');

module.exports = new Tp.ChannelClass({
    Name: 'FacebookPostPictureChannel',

    sendEvent(event) {
        var photoURL = event[0];
        var caption = event[1] || '';


    }
});
