// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingPedia
//
// Copyright 2016 Weston Makoto Mizumoto <westonm1@stanford.edu>
//                Dersu Abolfathi <dersua@stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');
const LookupsClient = require('twilio').LookupsClient;

// Twilio Credentials
var accountSid = 'AC9d005f8a60c176bbcccc85c57694b2c7';
var authToken = 'e93833ab8bd579edb0dafb4ca95056c3';

//require the Twilio module and create a REST client
var client = LookupsClient(accountSid, authToken);
var messagingClient = require('twilio')(accountSid, authToken);

module.exports = new Tp.ChannelClass({
	Name: "Lookup",

	sendEvent: function(event) {
		var recipientNumber = event[0];
		var queryNumber = event[1];
		console.log('Looking up query number: '+queryNumber);

		client.phoneNumbers(queryNumber).get( {
			type: 'carrier'
		}, function(error, number) {
		    messagingClient.sendMessage({
			    to:String(recipientNumber),
			    from:'+16506668936',
			    body:'Carrier type is '+number.carrier.type+', carrier name is '+number.carrier.name
			}, function(error, responseData) {
			    if (!error) {
				    console.log('Success! The SID for this message is:');
				    console.log(responseData.sid);
				    console.log('Message sent on:');
				    console.log(responseData.dateCreated);
			    } else {
				    console.log('Oops! There was an error.');
                    console.log(error);
			    }
			});
		});
	},
});
