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
    Name: 'FacebookPostPictureChannel',
    Extends: Tp.SimpleAction,

    _doInvoke: function(photoURL) {
        var fbURL = 'https://graph.facebook.com/v2.5/me/photos?url=%s'.format(encodeURIComponent(photoURL));

        return Tp.Helpers.Http.post(fbURL, '', { useOAuth2: this.device }).catch(function(error) {
            console.error('Error posting Facebook picture: ' + error.message);
        });
    }
});
