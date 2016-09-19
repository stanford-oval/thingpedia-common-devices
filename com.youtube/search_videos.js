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
        var videoId = event[1];
        var channelId = event[2];
        var channelTitle = event[3];
        var title = event[4];
        var description = event[5];
        var thumbnail = event[6];
        var count = event[7];

        var link = 'http://www.youtube.com/watch?v=' + encodeURIComponent(videoId);

        return [{
            type: 'rdl',
            displayTitle: title,
            displayText: description + "\nPublished by %s".format(channelTitle),
            callback: link,
            webCallback: link
        }, { type: 'picture', url: thumbnail }];
    },

    invokeQuery(filters) {
        var searchTerm = filters[0];
        var count = filters[7];
        if (count === null || count === undefined)
            count = 1;

        var url = Url.parse('https://www.googleapis.com/youtube/v3/search', true);
        url.query.part = 'id,snippet';
        url.query.safeSearch = 'none';
        url.query.type = 'video';
        url.query.q = searchTerm;
        url.query.maxResults = count;
        return Tp.Helpers.Http.get(Url.format(url),
            { useOAuth2: this.device }).then((data) => {
            var parsed = JSON.parse(data);
            return parsed.items.map((item) => {
                return [searchTerm, item.id.videoId, item.snippet.channelId, item.snippet.channelTitle,
                        item.snippet.title, item.snippet.description, item.snippet.thumbnails.high.url, count];
            });
        });
    },
});
