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
        var used = event[0];
        var allocated = event[1];

        return "You have used %.1f MBs out of %.1f available.".format(used/(1000*1000), allocated/(1000*1000));
    },

    invokeQuery(filters) {
        var auth = 'Bearer ' + this.device.accessToken;
        return Tp.Helpers.Http.post('https://api.dropboxapi.com/2/users/get_space_usage',
                                    '',
                                    { auth: auth,
                                      accept: 'application/json' })
            .then(function(response){
                var parsed = JSON.parse(response);
                return [[parsed.used, parsed.allocation.allocated]];
            });
    },
});
