// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 {jasonf2, kkiningh}@stanford.edu
//                Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');
const path = require('path');

module.exports = new Tp.ChannelClass({
    Name: 'OneDriveCreateFileAction',
    Extends: Tp.SimpleAction,

    _init: function(engine, device) {
        this.parent();
        this.device = device;
        this._baseurl = 'https://api.onedrive.com/v1.0/drive/items/';
    },

    get auth() {
        return "Bearer " + this.device.accessToken;
    },

    _doInvoke: function(fileName, url) {
        var dirname = path.dirname(fileName);
        if (!dirname || dirname === '.')
            dirname = 'root';
        var basename = path.basename(fileName);
        var url = this._baseurl + dirname + "/children";
        Tp.Helpers.Http.request(url, 'POST', JSON.stringify({
            '@content.sourceUrl': url,
            name: basename,
            file: {}
        }), {
            dataContentType: "application/json",
            extraHeaders: {
                'Prefer': 'respond-async'
            },
            auth: this.auth
        }).done();
    }
});
