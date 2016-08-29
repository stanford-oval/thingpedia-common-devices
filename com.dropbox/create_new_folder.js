// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Angela Xue <angelax@stanford.edu>
//                Bryce Taylor <btaylor3@stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

module.exports = new Tp.ChannelClass({
    Name: 'DropboxCreateNewFolderChannel',

    sendEvent(event) {
        var filename = event[0];
        if (!filename.startsWith('/'))
            filename = '/' + filename;

        return Tp.Helpers.Http.post('https://api.dropboxapi.com/2/files/create_folder',
                                    JSON.stringify({ path: filename }),
                                    { useOAuth2: this.device,
                                      dataContentType: 'application/json',
                                      accept: 'application/json' });
    },
});
