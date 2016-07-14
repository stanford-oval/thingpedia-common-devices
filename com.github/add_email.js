// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Andrew Lim <alim16@stanford.edu>
//                Xiangyu Yue <xyyue@stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

module.exports = new Tp.ChannelClass({
    Name: 'GithubEmailChannel',

    _init: function(engine, device) {
        this.parent();
        this._device = device;
    },

    sendEvent: function(event) {
        var email = event[0];
        var auth = "token " + this._device.accessToken;
        var userAgent = 'ThingEngine-Github-Interface';
        Tp.Helpers.Http.post('https://api.github.com/user/emails',
                             JSON.stringify([email]),
                             { auth: auth,
                               'user-agent': userAgent})
        // ignore errors
    },
});
