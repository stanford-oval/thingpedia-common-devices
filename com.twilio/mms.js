// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingPedia
//
// Copyright 2016 Quinlan Rachel Jung <quinlanj@stanford.edu>
//                Tushar Paul <aritpaul@stanford.edu>,
//
// See LICENSE for details

const Tp = require('thingpedia');

// Twilio Credentials
var accountSid = 'AC9d005f8a60c176bbcccc85c57694b2c7';
var authToken = 'e93833ab8bd579edb0dafb4ca95056c3';

//require the Twilio module and create a REST client
var client = require('twilio')(accountSid, authToken);

module.exports = new Tp.ChannelClass({
    Name: 'TwilioMMSChannel',

    sendEvent: function(event) {
        console.log('Posting Twilio mms event', event);

        var number = event[0].replace("-", "");
        var body = event[1];
        var mmsURL = event[2];
        if (body == "")
        {
            client.messages.create({
                to: number,
                from: "+16506668936", // 15005550006
                mediaUrl: mmsURL,
            }, function(err, message) {
                console.log(message);
                console.log(err);
            });
        }
        else
        {
            client.messages.create({
                to: number,
                from: "+16506668936", // 15005550006
                body: body,
                mediaUrl: mmsURL,
            }, function(err, message) {
                console.log(message);
                console.log(err);
            });
        }
    },
});


 
