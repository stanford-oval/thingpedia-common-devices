// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Silei Xu <silei@stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

URL_BASE = "https://www.googleapis.com/gmail/v1/users/";


module.exports = new Tp.ChannelClass({
    Name: 'SendGMail',

    _init: function(engine, device) {
        this.parent();
        this.device = device;
        this.auth = 'Bearer ' + this.device.accessToken;
        this.url = URL_BASE + this.device.userId + '/messages/send';
    },

    sendEvent: function(event) {
        var to = event[0];
        var subject = event[1];
        var message = event[2];
        var raw = "Content-Type:  text/plain; charset=\"UTF-8\"\n" +
            "to: " + to +
            "\nsubject: " + subject +
            "\n\n" + message;
        var encoded = new Buffer(raw).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
        return Tp.Helpers.Http.post(this.url, JSON.stringify({raw: encoded}), {
            auth: this.auth,
            dataContentType: 'application/json'
        });
    }
});
