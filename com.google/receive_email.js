// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingPedia
//
// Copyright 2016 Huafei Wang <huafei@stanford.edu>
//                Ye Yuan <yy0222@stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

module.exports = new Tp.ChannelClass({
    Name: 'GmailPollingTrigger',
    Extends: Tp.HttpPollingTrigger,
    RequiredCapabilities: ['channel-state'],
    interval: 60000,

    _init: function(engine, state, device) {
        this.parent();
        this.state = state;
        this.device = device;
        this.url = 'https://www.googleapis.com/gmail/v1/users/' + this.device.userId + '/messages?maxResults=1';
    },

    get auth() {
        return 'Bearer ' + this.device.accessToken;
    },

    _onResponse: function(data) {
        var parsed_package = JSON.parse(data);
        var msgs = parsed_package.messages;
        var newest_msg = msgs[0];
        var threadId = newest_msg.threadId;

        if (!this.state.get(threadId)) {
            this.state.set(threadId, true);

            var getUrl = 'https://www.googleapis.com/gmail/v1/users/' + this.device.userId + '/messages/' + threadId;
            Tp.Helpers.Http.get(getUrl, { auth: this.auth, accept: 'application/json' })
            .then(function(response) {
                var parsed = JSON.parse(response);
                var headers = parsed.payload.headers;
                var sender, subject;

                for (var i = 0; i < headers.length; i++) {
                    var header = headers[i];
                    if (header.name === 'From')
                        sender = header.value;
                    else if (header.name === 'Subject')
                        subject = header.value;
                }

                this.emitEvent([sender, subject, threadId]);
            }.bind(this)).catch(function(e) {
                console.error('Error while retrieving new email from Google: ' + e.message);
            }).done();
        }
    },
});



