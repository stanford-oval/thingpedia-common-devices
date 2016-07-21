// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Sunkyu Lim <limsk1@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');
const INTERVAL = 10 * 60 * 1000; // 10 minutes

const ID_URL = "https://api.instagram.com/v1/users/search?q=%s&access_token=%s";
const MEDIA_URL = "https://api.instagram.com/v1/users/%s/media/recent/?access_token=%s&count=1";

module.exports = new Tp.ChannelClass({
    Name: 'InstagramNewPicChannel',
    RequiredCapabilities: ['channel-state'],

    _init: function(engine, state, device, params) {
        this.parent();
        this.device = device;
        this._state = state;

        this.pic_username = this._params[0];
        if (!this.pic_username)
            throw new TypeError('Missing required parameter');

        this.filterString = this.pic_username;
        this.id_url = ID_URL.format(encodeURIComponent(this.pic_username), this.device.accessToken);
    },

    _doOpen() {
        if (this._state.get('user_id') !== undefined) {
            this._baseurl = MEDIA_URL.format(user.id, this.device.accessToken);
            this.url = this._baseurl;
            setTimeout(this._realQuery.bind(this), 5000);
            return;
        }

        return Tp.Helpers.Http.get(this.id_url).then((response) => {
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

            this._state.set('user_id', user.id);

            this._baseurl = MEDIA_URL.format(user.id, this.device.accessToken);
            this.url = this._baseurl;
            setTimeout(this._realQuery.bind(this), 5000);
        });
    },

    formatEvent(event) {
        var username = event[0];
        var mediaId = event[1];
        var picture = event[2];
        var caption = event[3];
        var link = event[4];

        return [{
            type: 'rdl',
            displayTitle: "%s upload a new picture".format(username),
            displayText: caption,
            webCallback: link,
            callback: link,
        }, {
            type: 'picture',
            url: picture
        }];
    },

    _realQuery(){
        Tp.Helpers.Http.get(this.url).then((response) => {
            var state = this._state;

            var parsed;
            try {
                parsed = JSON.parse(response);
            } catch (e) {
                console.log('Error parsing Instagram server response: ' + e.message);
                console.log('Full response was');
                console.log(response);
                return;
            }

            if (parsed.data.length === 0)
                return;

            var obj = parsed.data[0];

            var recentRead = state.get('recent_id');

            if (recentRead === undefined || obj.id !== recentRead) {
                state.set('recent_id', obj.id);
                this.url = this._baseurl + "&min_id=" + obj.id;

                var event = [this.pic_username, obj.id, obj.images.standard_resolution.url, obj.caption.text, obj.link];
                this.emitEvent(event);
            }

            setTimeout(this._realQuery.bind(this), INTERVAL);
        }).catch((error) => {
            console.error('Error reading from Instagram server: ' + error.message);
        });
    }
});
