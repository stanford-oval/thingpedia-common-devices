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

    _init: function(engine, device) {
        this.parent();
        this.auth = 'Bearer ' + device.accessToken;
    },

    _doInvoke: function(text) {
        Tp.Helpers.Http.post('https://graph.facebook.com/v2.5/me/feed', 'message=' + encodeURIComponent(text), { auth: this.auth }).catch(function(error) {
            console.error('Error posting on Facebook: ' + error.message);
        });
    }
});
