// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2017 Silei Xu <silei@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

module.exports = new Tp.ChannelClass({
    Name: "PostBike",

    sendEvent: function(event) {
        var data = JSON.stringify({
            brand: event[0],
            model: event[1],
            gender: event[2],
            size: event[3],
            price: event[4],
            poster: event[5],
            phone: event[6]
        });
        return Tp.Helpers.Http.post(
            'https://colby.stanford.edu/api/bikes/', data, {
                dataContentType: 'application/json',
                accept: 'application/json',
                extraHeaders: { 'Content-Length': Buffer.byteLength(data) }
            }
        ).catch(function(error) {
            console.error('Error posting on Almond Bike Market: ' + error.message);
        });
    }
});
