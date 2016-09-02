// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Silei Xu <silei@stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');
const mailcomposer = require('mailcomposer');

URL_BASE = "https://www.googleapis.com/upload/gmail/v1/users/me/messages/send";

module.exports = new Tp.ChannelClass({
    Name: 'SendGMail',

    _init: function(engine, device) {
        this.parent(engine, device);
        this.url = URL_BASE;
    },

    sendEvent: function(event) {
        var stream = mailcomposer({
            to: event[0],
            subject: event[1],
            text: event[2]
        }).createReadStream();

        return Tp.Helpers.Http.postStream(this.url, stream, {
            useOAuth2: this.device,
            dataContentType: 'message/rfc822'
        });
    }
});
