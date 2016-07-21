// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Sunkyu Lim <limsk1@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

const ID_URL = "https://api.instagram.com/v1/users/search?q=%s&access_token=%s";
const MEDIA_URL = "https://api.instagram.com/v1/users/%s/media/recent/?access_token=%s&count=1";
const LIKE_URL = "https://api.instagram.com/v1/media/%s/likes";

module.exports = new Tp.ChannelClass({
    Name: 'InstagramLikeMostRecentChannel',

    _init: function(engine, device) {
        this.parent();
        this.device = device;
    },

    sendEvent: function(event) {
        var url = ID_URL.format(encodeURIComponent(event[0]), this.device.accessToken);

        return Tp.Helpers.Http.get(url).then((response) => {
            var parsed = JSON.parse(response);

            var user = null;
            for (var candidate of parsed.data) {
                if (candidate.username === this.pic_username) {
                    user = candidate;
                    break;
                }
            }

            if (user === null)
                throw new TypeError("There is no such user");

            var url = MEDIA_URL.format(user.id, this.device.accessToken);
            return Tp.Helpers.Http.get(url);
        }).then((response) => {
            var parsed = JSON.parse(response);
            if (parsed.data.length === 0)
                return;

            var url = LIKE_URL.format(parsed.data[0].id);
            return Tp.Helpers.Http.post(url, 'access_token=' + this.device.accessToken);
        });
    },
});
