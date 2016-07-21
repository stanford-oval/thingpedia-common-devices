// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Sunkyu Lim <limsk1@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

const ID_URL = "https://api.instagram.com/v1/users/search?q=%s&access_token=%s";
const FOLLOW_URL = "https://api.instagram.com/v1/users/%s/relationships?access_token=%s&action=follow";

module.exports = new Tp.ChannelClass({
    Name: 'InstagramFollowUserChannel',

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

            var url = FOLLOW_URL.format(user.id, this.device.accessToken);
            return Tp.Helpers.Http.post(url, '');
        });
    },
});
