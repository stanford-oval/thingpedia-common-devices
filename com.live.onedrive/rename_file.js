// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 {jasonf2, kkiningh}@stanford.edu
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

module.exports = new Tp.ChannelClass({
    Name: 'OneDriveCreateFileAction',
    Extends: Tp.SimpleAction,

    _init: function(engine, device) {
        this.parent(engine, device);
        this._baseurl = 'https://api.onedrive.com/v1.0/drive/root/children/';
    },

    _doInvoke: function(fileName, newFilename) {
        var body = JSON.stringify({ name: newFilename });
        var url = this._baseurl + fileName;
        return Tp.Helpers.Http.request(url, 'PATCH', body, {
            dataContentType: "text/plain",
            useOAuth2: this.device
        });
    }
});
