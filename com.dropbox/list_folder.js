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
    Name: 'DropboxListFolderChannel',

    formatEvent(event) {
        var folderName = event[0];
        var name = event[1];
        var isFolder = event[2];
        var lastModified = event[3];
        var size = event[4];
        var path = event[5];

        if (isFolder)
            return "%s (dir)".format(name);
        else
            return "%s (reg, %d bytes)".format(name, size);
    },

    invokeQuery(filters) {
        var name = filters[0];
        if (!name.startsWith('/'))
            name = '/' + name;
        if (name === '/')
            name = '';

        return Tp.Helpers.Http.post('https://api.dropboxapi.com/2/files/list_folder',
                                    JSON.stringify({ path: name, recursive: false }),
                                    { useOAuth2: this.device,
                                      dataContentType: 'application/json',
                                      accept: 'application/json' }).then((data) => {
            var parsed = JSON.parse(data);

            return parsed.entries.map((entry) => {
                if (entry['.tag'] === 'folder') {
                    return [filters[0],
                            entry.name,
                            true,
                            null,
                            0,
                            entry.path_lower];
                } else {
                    return [filters[0],
                            entry.name,
                            entry['.tag'] === 'folder',
                            Date.parse(entry.client_modified),
                            entry.size,
                            entry.path_lower];
                }
            });
        });
    },
});
