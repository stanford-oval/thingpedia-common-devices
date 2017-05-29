// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2017 Silei Xu <silei@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

module.exports = new Tp.ChannelClass({
    Name: "PostBike",

    sendEvent: function(event) {
        var data = JSON.stringify({ title: event[0], price: event[1], info: event[2], poster: event[3] });
        return Tp.Helpers.Http.post(
            'https://colby.stanford.edu/main/api/bikes/', data, {
                dataContentType: 'application/json',
                accept: 'application/json',
                extraHeaders: { 'Content-Length': Buffer.byteLength(data) }
            }
        ).catch(function(error) {
            console.error('Error posting on Almond Bike Market: ' + error.message);
        });
    }
});
