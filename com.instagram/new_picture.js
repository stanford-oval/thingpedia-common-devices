// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Sunkyu Lim <limsk1@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');
const INTERVAL = 10 * 60 * 1000; // 10 minutes

const MEDIA_URL = "https://api.instagram.com/v1/users/self/media/recent/?access_token=%s&count=1";

module.exports = new Tp.ChannelClass({
    Name: 'InstagramNewPicChannel',
    Extends: Tp.HttpPollingTrigger,
    RequiredCapabilities: ['channel-state'],

    _init: function(engine, state, device, params) {
        this.parent(engine, state, device);
        this.device = device;
        this._state = state;

        this.interval = INTERVAL;
        this._baseurl = MEDIA_URL.format(this.device.accessToken);
        this.url = this._baseurl;
    },

    formatEvent(event, hint, formatter) {
        var mediaId = event[0];
        var picture = event[1];
        var caption = event[2];
        var link = event[3];
        var instagramFilter = event[4];
        var tags = event[5];
        var location = event[6];

        if (hint === 'string-title')
            return "New picture".format(username);
        else if (hint === 'string-body')
            return caption + '\nURL: ' + picture;
        else if (hint.startsWith('string'))
            return "You uploaded a new picture\n%s\nURL: %s".format(username, caption, picture);
        // else fall through

        return [{
            type: 'rdl',
            displayTitle: "You uploaded a new picture",
            displayText: caption,
            webCallback: link,
            callback: link,
        }, {
            type: 'picture',
            url: picture
        }];
    },

    _onResponse(response) {
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

            var loc;
            if (obj.location)
                loc = { x: obj.location.longitude, y: obj.location.latitude };
            else
                loc = { x: 0, y: 0 };
            var event = [obj.id, obj.images.standard_resolution.url, obj.caption.text, obj.link, (obj.filter || '').toLowerCase(), obj.tags, loc];
            this.emitEvent(event);
        }
    }
});
