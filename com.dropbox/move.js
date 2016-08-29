// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Angela Xue <angelax@stanford.edu>
//                Bryce Taylor <btaylor3@stanford.edu>
//                Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const path = require('path');
const Tp = require('thingpedia');

module.exports = new Tp.ChannelClass({
    Name: 'DropboxMoveFileChannel',

    sendEvent(event) {
        var filename = event[0];
        if (!filename.startsWith('/'))
            filename = '/' + filename;
        var newname = event[1];
        if (newname.indexOf('/') < 0)
            newname = path.dirname(filename) + '/' + newname;
        if (!newname.startsWith('/'))
            newname = '/' + newname;

        return Tp.Helpers.Http.post('https://api.dropboxapi.com/2/files/move',
                                    JSON.stringify({ from_path: filename, to_path: newname }),
                                    { useOAuth2: this.device,
                                      dataContentType: 'application/json',
                                      accept: 'application/json' });
    },
});
