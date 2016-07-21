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
        this.parent();
        this.device = device;
        this._baseurl = 'https://api.onedrive.com/v1.0/drive/root/children/';
    },

    get auth() {
        return "Bearer " + this.device.accessToken;
    },

    _doInvoke: function(fileName, body) {
        var url = this._baseurl + fileName + "/content";
        Tp.Helpers.Http.request(url, 'PUT', body, {
            dataContentType: "text/plain",
            auth: this.auth
        }).done();
    }
});
