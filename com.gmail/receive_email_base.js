// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Silei Xu <silei@stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

const URL_BASE = 'https://www.googleapis.com/gmail/v1/users';
const POLL_URL = URL_BASE + '/me/messages?maxResults=1';

module.exports = function (name, query) {
    return new Tp.ChannelClass({
        Name: name,
        Extends: Tp.HttpPollingTrigger,
        RequiredCapabilities: ['channel-state'],
        interval: 60000,

        _init: function (engine, state, device, params) {
            this.parent(engine, state, device);
            this.state = state;
            this.params = params;

            this.url = POLL_URL + '&q=' + encodeURIComponent('in:inbox ' + query);

            this.useOAuth2 = device;
        },

        formatEvent: function (event, hint, formatter) {
            var sendername = event[0];
            var senderaddress = event[1];
            var subject = event[2];
            var date = event[3];
            var labels = event[4];
            var snippet = event[5];

            var title;
            if (sendername)
                title = "New email from %s <%s>: %s".format(sendername, senderaddress, subject);
            else
                title = "New email from %s: %s".format(senderaddress, subject);

            switch (hint) {
            case 'string-title':
                return title;
            case 'string-body':
                return snippet;
            default:
                return title + ': ' + snippet;
            }
        },

        _onResponse: function (data) {
            var parsed_package = JSON.parse(data);
            var msgs = parsed_package.messages;
            if (!msgs)
                return;

            var newest_msg = msgs[0];
            var threadId = newest_msg.threadId;

            if (this.state.get(threadId))
                return;

            this.state.set(threadId, true);
            var getUrl = URL_BASE + '/' + this.device.userId + '/messages/' + threadId;
            return Tp.Helpers.Http.get(getUrl, { useOAuth2: this.device, accept: 'application/json'})
                .then((response) => {
                    var parsed = JSON.parse(response);
                    var snippet = parsed.snippet;
                    var headers = parsed.payload.headers;
                    var sender, subject, date;

                    for (var i = 0; i < headers.length; i++) {
                        var header = headers[i];
                        if (header.name === 'From') {
                            sender = header.value;
                        } else if (header.name === 'Subject')
                            subject = header.value;
                        else if (header.name === 'Date')
                            date = new Date(header.value);
                    }

                    var sendername, senderaddress;
                    var match = /^"([^"]+)"\s+<([^>]+)>$/.exec(sender);
                    if (match !== null) {
                        sendername = match[0];
                        senderaddress = match[1];
                    } else {
                        var match = /^([^\s]+)\s+<([^>]+)>$/.exec(sender);
                        if (match !== null) {
                            sendername = match[0];
                            senderaddress = match[1];
                        } else {
                            sendername = null;
                            senderaddress = sender;
                        }
                    }

                    snippet = snippet.replace(/&#([0-9]+);/g, function(str, code) { return String.fromCharCode(parseInt(code, 10)); });

                    return this.device.resolveLabels(parsed.labelIds).then((resolved) => {
                        var labels = parsed.labelIds.map((id) => resolved.get(id));
                        this.emitEvent([sendername, senderaddress, subject, date, labels, snippet]);
                    });
                }).catch(function (e) {
                    console.error('Error while retrieving new email from Google: ' + e.message);
                });
        }
    });
};



