// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2017 Silei Xu <silei@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

module.exports = new Tp.ChannelClass({
    Name: "PostDate",

    sendEvent: function(event) {
        var data = JSON.stringify({
            interest: event[0],
            message: event[1],
            poster: event[2],
            phone: event[3]
        });
        return Tp.Helpers.Http.post(
            'https://colby.stanford.edu/main/api/dates/', data, {
                dataContentType: 'application/json',
                accept: 'application/json',
                extraHeaders: { 'Content-Length': Buffer.byteLength(data) }
            }
        ).catch(function(error) {
            console.error('Error posting on Almond Dates: ' + error.message);
        });
    }
});
