// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingPedia
//
// Copyright 2016 Huafei Wang <huafei@stanford.edu>
//                Ye Yuan <yy0222@stanford.edu>
//
// See COPYING for details

const Tp = require('thingpedia');

module.exports = new Tp.ChannelClass({
    Name: 'GmailTrashChannel',

    _init: function (engine, device) {
        this.parent();
        this.device = device;
    },

    get auth() {
        return 'Bearer ' + this.device.accessToken;
    },

    sendEvent: function (event) {
        var messageID = event[0];
        var trashUrl = 'https://www.googleapis.com/gmail/v1/users/me/messages/' + messageID + '/trash';

        Tp.Helpers.Http.post(trashUrl, '', { auth: this.auth, accept: 'application/json' });
    }
});
