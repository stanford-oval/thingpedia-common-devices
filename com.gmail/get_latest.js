// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Silei Xu <silei@stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');
const URL_BASE = 'https://www.googleapis.com/gmail/v1/users/';
const filter_names = ['from', 'subject', 'label'];
const filter_descriptions = [' from ', ' with subject ', ' with label '];

function httpGetUrl(url, device, filters) {
    var search_query = 'in:inbox ';
    for (var i = 0; i < filters.length; i++)
        if (filters[i] !== undefined)
            search_query += '%s:%s '.format(filter_names[i], filters[i]);
    url = url + '&q=%s'.format(search_query.trim());
    return Tp.Helpers.Http.get(url, { useOAuth2: device, accept: 'application/json'}).then(function(data) {
        var parsed_package = JSON.parse(data);
        var msgs = parsed_package.messages;
        if (msgs === undefined || msgs.length === 0)
            return null;
        var newest_msg = msgs[0];
        var threadId = newest_msg.threadId;
        var getUrl = URL_BASE + device.userId + '/messages/' + threadId;
        return getUrl;
    });
}

module.exports = new Tp.ChannelClass({
    Name: "GetLatestGmail",
    
    _init: function(engine, device, params) {
        this.parent();
        this.device = device;
        this.url = URL_BASE + this.device.userId + '/messages?maxResults=1';
    },

    formatEvent: function(event, filters) {
        return event[3];
    },


    invokeQuery: function(filters) {
        return httpGetUrl(this.url, this.device, filters).then(function(getUrl) {
            if (getUrl === null)
                return null;
            return Tp.Helpers.Http.get(getUrl, { useOAuth2: this.device, accept: 'application/json'});
        }.bind(this)).then(function (response) {
            if (response === null) {
                var message = "Sorry, I can't find any email";
                for (var i = 0; i < filters.length; i++) {
                    if (filters[i] !== undefined)
                        message += filter_descriptions[i] + filters[i];
                }
                message += " from your Gmail inbox.";
            } else {
                var parsed = JSON.parse(response);
                var snippet = parsed.snippet;
                var headers = parsed.payload.headers;
                var sender, subject, date;

                for (var i = 0; i < headers.length; i++) {
                    var header = headers[i];
                    if (header.name === 'From') {
                        sender = header.value;
                    }
                    else if (header.name === 'Subject')
                        subject = header.value;
                    else if (header.name === 'Date')
                        date = header.value;
                }
                var message = '%s\n%s\n%s\n%s'.format(sender, subject, date, snippet);
            }
            return [[filters[0], filters[1], filters[2], message]];
        }.bind(this));
    }

});
