// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const Url = require('url');
const Tp = require('thingpedia');

module.exports = new Tp.ChannelClass({
    Name: 'YouTubeSearchChannels',

    formatEvent(event) {
        var searchTerm = event[0];
        var channelId = event[1];
        var title = event[2];
        var description = event[3];
        var thumbnail = event[4];

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
        var searchTerm = filters[0];

        var url = Url.parse('https://www.googleapis.com/youtube/v3/search', true);
        url.query.part = 'id,snippet';
        url.query.safeSearch = 'none';
        url.query.type = 'channel';
        url.query.q = searchTerm;
        url.query.maxResults = 5;
        return Tp.Helpers.Http.get(Url.format(url),
            { useOAuth2: this.device }).then((data) => {
            var parsed = JSON.parse(data);
            return parsed.items.map((item) => {
                return [searchTerm, item.id.channelId, item.snippet.title, item.snippet.description, item.snippet.thumbnails.high.url];
            });
        });
    },
});
