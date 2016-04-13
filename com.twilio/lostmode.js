// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingPedia
//
// Copyright 2016 Weston Makoto Mizumoto <westonm1@stanford.edu>
//                Dersu Abolfathi <dersua@stanford.edu>
//
// See COPYING for details

const Tp = require('thingpedia');

// Twilio Credentials
var accountSid = 'AC9d005f8a60c176bbcccc85c57694b2c7';
var authToken = 'e93833ab8bd579edb0dafb4ca95056c3';

//require the Twilio module and create a REST client
var client = require('twilio')(accountSid, authToken);

module.exports = new Tp.ChannelClass({
	Name: "LostMode",
	RequiredCapabilities: ['webhook-api'],

	// Makes call every 30 minutes, with specified message. Initiated right away.
	sendEvent: function(event) {
		var recipientNumber = event[0];
		this.message = event[1];
		console.log('Lost phone with number: '+recipientNumber);

		var msDelay = 180000;
		var twimlUrl = this.url;
		for (var i=0; i<10; i++) {
			console.log('Call number: '+i);
			setTimeout(function() {
				client.makeCall({
				    to: String(recipientNumber),
				    from: '+16506668936',
				    url: twimlUrl
				}, function(error, responseData) {
				    if (!error) {
					    console.log('Call status is:'+responseData);
					    console.log('Success! The SID for this message is:'+responseData.sid);
					    console.log('Message sent on:'+responseData.dateCreated);
				    } else {
					    console.log('Oops! There was an error.');
					    console.log(error);
				    }
				});
			}, i*msDelay);
		}


	},

  	_doOpen: function() {
		var webhookApi = this.engine.platform.getCapability('webhook-api');
		this._id = this.uniqueId;
		this.url = webhookApi.getWebhookBase() + '/' + this._id;
		this._listener = this._onCallback.bind(this);
		webhookApi.registerWebhook(this._id, this._listener);
	},

	_doClose: function() {
		var webhookApi = this.engine.platform.getCapability('webhook-api');
		webhookApi.unregisterWebhook(this._id, this._listener);
	},

    _onCallback: function(method, query, headers, payload) {
		var resp = '<Response><Say voice="alice">' + this.message + '</Say></Response>';
		return { code: 200, response: resp, contentType: 'application/xml' };
   	 }
});
