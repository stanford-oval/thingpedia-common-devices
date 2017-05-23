// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2017 Silei Xu <silei@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

module.exports = new Tp.ChannelClass({
    Name: "AnswerQuestion",

    sendEvent: function(event) {
        var data = JSON.stringify({ id: event[0], info: event[1] + '=' + event[2]});
        console.log(data);
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
