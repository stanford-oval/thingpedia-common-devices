// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Sunkyu Lim <limsk1@cs.stanford.edu>
//                Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

const LOCATION_URL = 'https://api.instagram.com/v1/locations/search?lat=%f&lng=%f&access_token=%s';
const URL = "https://api.instagram.com/v1/locations/%s/media/recent?access_token=%s&count=%d";

module.exports = new Tp.ChannelClass({
    Name: 'InstagramByLocationChannel',

    _init: function(engine, device) {
        this.parent();
        this.device = device;
    },

    formatEvent(event, filters, hint, formatter) {
        var location = event[0];
        var count = event[1];
        var username = event[2];
        var mediaId = event[3];
        var picture = event[4];
        var caption = event[5];
        var link = event[6];

        if (hint === 'string-title')
            return "Picture by %s".format(username);
        else if (hint === 'string-body')
            return caption + '\nURL: ' + picture;
        else if (hint.startsWith('string'))
            return "Picture by %s\n%s\nURL: %s".format(username, caption, picture);
        // else fall through

        return [{
            type: 'rdl',
            displayTitle: "Picture by %s".format(username),
            displayText: caption,
            webCallback: link,
            callback: link,
        }, {
            type: 'picture',
            url: picture
        }];
    },

    invokeQuery(filters) {
        var location = filters[0];
        var count = filters[1];
        if (count === undefined || count === null)
            count = 5;

        var loc_url = LOCATION_URL.format(location.y, location.x, this.device.accessToken);
        return Tp.Helpers.Http.get(loc_url).then((response) => {
            var parsed = JSON.parse(response);

            var url = URL.format(parsed.data[0].id, this.device.accessToken, count);
            return Tp.Helpers.Http.get(url);
        }).then((response) => {
            var parsed = JSON.parse(response);

            return parsed.data.map((obj) => {
                return [location, count, obj.user.username, obj.id, obj.images.standard_resolution.url, obj.caption.text, obj.link];
            });
        });
    },
});
