// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Angela Xue <angelax@stanford.edu>
//                Bryce Taylor <btaylor3@stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

module.exports = new Tp.ChannelClass({
    Name: 'DropboxGetSpaceUsageChannel',

    formatEvent(event, filters) {
        var filename = event[0];
        var url = event[1];

        return [{
            type: 'rdl',
            displayTitle: filename,
            webCallback: url,
            callback: url
        }];
    },

    invokeQuery(filters) {
        var name = filters[0];
        if (!name.startsWith('/'))
            name = '/' + name;
        return Tp.Helpers.Http.post('https://api.dropboxapi.com/2/files/get_temporary_link',
                                    JSON.stringify({ path: name }),
                                    { useOAuth2: this.device,
                                      dataContentType: 'application/json',
                                      accept: 'application/json' })
            .then(function(response){
                var parsed = JSON.parse(response);
                return [[filters[0], parsed.link]];
            });
    },
});
