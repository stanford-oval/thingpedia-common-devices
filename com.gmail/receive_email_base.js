// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Silei Xu <silei@stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

const URL_BASE = 'https://www.googleapis.com/gmail/v1/users/';

function httpGetUrl(userId, filters, query) {
    var url = URL_BASE + userId + '/messages?maxResults=1';
    var filter_names = ['from', 'subject', 'label'];
    var search_query = 'in:inbox ';
    for (var i = 0; i < filters.length; i++)
        if (filters[i] !== undefined)
            search_query += '%s:%s '.format(filter_names[i], filters[i]);
    if (query.length > 0)
        search_query += query;
    url = url + '&q=%s'.format(search_query.trim());
    return url;
}

module.exports = function (name, query, format, emit) {
    return new Tp.ChannelClass({
        Name: name,
        Extends: Tp.HttpPollingTrigger,
        RequiredCapabilities: ['channel-state'],
        interval: 60000,

        _init: function (engine, state, device, params) {
            this.parent();
            this.state = state;
            this.device = device;
            this.params = params;
            this.url = httpGetUrl(this.device.userId, params, query);
            this.filterString = this.params.join('-');
        },

        formatEvent: format,

        _onResponse: function (data) {
            var parsed_package = JSON.parse(data);
            var msgs = parsed_package.messages;
            var newest_msg = msgs[0];
            var threadId = newest_msg.threadId;
            var params = this.params;

            if (!this.state.get(threadId)) {
                this.state.set(threadId, true);
                var getUrl = URL_BASE + this.device.userId + '/messages/' + threadId;
                Tp.Helpers.Http.get(getUrl, { useOAuth2: this.device, accept: 'application/json'})
                    .then(function (response) {
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
                                date = header.value;
                        }

                        var message = '%s\n%s\n%s\n%s'.format(sender, subject, date, snippet);
                        params.push(message);
                        emit.call(this, params);
                    }.bind(this)).catch(function (e) {
                    console.error('Error while retrieving new email from Google: ' + e.message);
                }).done();
            }
        }
    });
};



