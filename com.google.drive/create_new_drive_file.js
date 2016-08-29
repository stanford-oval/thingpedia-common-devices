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

    sendEvent: function(event) {
    	var url = 'https://www.googleapis.com/drive/v3/files';
    	var fileName = event[0];
        var data = JSON.stringify({ name: fileName });

        return Tp.Helpers.Http.post(url, data, { useOAuth2: this.device, dataContentType: 'application/json' })
            .catch(function(e) {
                console.error('Failed to create new file in Google Drive: ' + e.message);
            });
    }
});
