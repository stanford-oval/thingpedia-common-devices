// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const Url = require('url');
const Tp = require('thingpedia');

module.exports = new Tp.ChannelClass({
    Name: 'YouTubeSubscriptionsChannel',

    formatEvent(event) {
        var channelId = event[0];
        var title = event[1];
        var description = event[2];
        var thumbnail = event[3];

        var link = 'http://www.youtube.com/channel/' + channelId;

        return [{
            type: 'rdl',
            displayTitle: title,
            displayText: description,
            callback: link,
            webCallback: link
        }, { type: 'picture', url: thumbnail }];
    },

    invokeQuery(filters) {
        return Tp.Helpers.Http.get('https://www.googleapis.com/youtube/v3/subscriptions?part=id,snippet&mine=true',
            { useOAuth2: this.device }).then((data) => {
            var parsed = JSON.parse(data);
            return parsed.items.map((item) => {
                return [item.snippet.resourceId.channelId, item.snippet.title, item.snippet.description, item.snippet.thumbnails.high.url];
            });
        });
    },
});
