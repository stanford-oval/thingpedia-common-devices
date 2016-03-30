// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingPedia
//
// Copyright 2016 Linyu He <linyu90@stanford.edu>
//                Lingbin Li <lingbin@stanford.edu>
//
// See COPYING for details

const Tp = require('thingpedia');

module.exports = new Tp.ChannelClass({
    Name: 'GoogleDocsCreateFileAction',

    _init: function(engine, device) {
        this.parent();
        this.device = device;
    },

    get auth() {
        return 'Bearer ' + this.device.accessToken;
    },

    sendEvent: function(event) {
    	var url = 'https://www.googleapis.com/drive/v3/files';
    	var auth = 'Bearer ' + this.accessToken;
    	var fileName = event[0];
        var data = JSON.stringify({ name: fileName });

        Tp.Helpers.Http.post(url, data, { auth: auth, dataContentType: 'application/json' })
            .catch(function(e) {
                console.error('Failed to create new file in Google Drive: ' + e.message);
            }).done();
    }
});
