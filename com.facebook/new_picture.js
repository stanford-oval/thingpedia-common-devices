// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingPedia
//
// Copyright 2016 Lingxiao Li <csimstu@stanford.edu>
//                Kaidi Yan <kaidi@stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

module.exports = new Tp.ChannelClass({
    Name: 'FacebookPictureSourceChannel',
    Extends: Tp.HttpPollingTrigger,
    interval: 600000, // 10m

    _init: function(engine, device, params) {
        this.parent();
        this.device = device;

        this.base_url = 'https://graph.facebook.com/me?fields=albums.limit(5){name, photos.since(%s).order(reverse_chronological).limit(5){images}}';
        this.timestamp = Math.floor(Date.now() / 1000);
        this.url = this.base_url.format(this.timestamp);
    },

    get auth() {
        return 'Bearer ' + this.device.accessToken;
    },

    _onResponse: function(response) {
        var new_photos = [];
        var parsed = JSON.parse(response);
        for (var i = 0; i < parsed.albums.data.length; i++) {
            var album = parsed.albums.data[i];
            if (album && album.photos) {
                for (var j = 0; j < album.photos.data.length; j++) {
                    var images = album.photos.data[j].images;
                    new_photos.push(images[0].source);
                }
            }
        }

        new_photos.forEach(function() {
            this.emitEvent([new_photos]);
        }, this);

        this.timestamp = Math.floor(Date.now() / 1000);
        this.url = this.base_url.format(this.timestamp);
    }
});
