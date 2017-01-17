// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Sunkyu Lim <limsk1@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');
const INTERVAL = 10 * 60 * 1000; // 10 minutes

const MEDIA_URL = "https://api.instagram.com/v1/users/self/media/recent/?access_token=%s&count=%d";

module.exports = new Tp.ChannelClass({
    Name: 'InstagramGetPicsChannel',

    formatEvent(event, filters, hint, formatter) {
        var count = event[0];
        var mediaId = event[1];
        var picture = event[2];
        var caption = event[3];
        var link = event[4];
        var instagramFilter = event[5];
        var tags = event[6];
        var location = event[7];

        return [caption, {
            type: 'picture',
            url: picture
        }];
    },

    invokeQuery(filters) {
        var count = filters[0];
        if (count === undefined || count === null)
            count = 3;

        var url = MEDIA_URL.format(this.device.accessToken, count);
        return Tp.Helpers.Http.get(url).then((response) => {
            var parsed = JSON.parse(response);
            if (parsed.data.length === 0)
                return;

            return parsed.data.map((obj) => {
                var loc;
                if (obj.location)
                    loc = { x: obj.location.longitude, y: obj.location.latitude };
                else
                    loc = { x: 0, y: 0 };
                var event = [count, obj.id, obj.images.standard_resolution.url, obj.caption ? obj.caption.text : '', obj.link, (obj.filter || '').toLowerCase(), obj.tags, loc];
                return event;
            });
        });
    }
});
