// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingPedia
//
// Copyright 2016 Weston Makoto Mizumoto <westonm1@stanford.edu>
//                Dersu Abolfathi <dersua@stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

module.exports = new Tp.ChannelClass({
	Name: "WakeupCall",
	RequiredCapabilities: ['webhook-api'],

	_init: function(engine, device, params) {
		// we want a ToD param
		this.parent();
		console.log("in init of wakeupcall");
	},

	// recipient phone number
	// datetime
	// number of snoozes
	sendEvent: function(event) {
		console.log("in send event");
		var recipientNumber = event[0];
		// (year, month, day, hours, minutes, seconds, milliseconds)
		var alarmDatetime = new Date(event[1],event[2]-1,event[3],event[4],event[5],0,0);
		console.log('ALARM DATE: '+alarmDatetime);
		console.log('NOW: '+(new Date()));
		var delta = alarmDatetime.getTime() - (new Date()).getTime(); // in milliseconds
		console.log('DELTA: '+delta);
		var hookUrl = this.url;

		setTimeout(function() {
			var client = require('twilio')('ACa77cde6e3097d6728f78d5000eeacea3', '2ea697ad3df1e377a31dd0fe3966af88');
			console.log('NUMBER: '+this.recipientNumber);
			console.log('NUMBER: '+recipientNumber);
			client.makeCall({
			    to:String(recipientNumber),
			    from:'+19494155813',
			    url:hookUrl
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
		}, delta);

/*
		promise.then(function(call) {
			console.log('Successful call: '+call);
		}, function(error) {
			console.log('ERROR: '+error);
		});*/
	},

  	_doOpen: function() {
		console.log("in do open");
		var webhookApi = this.engine.platform.getCapability('webhook-api');
		this._id = this.uniqueId; // make some ID (eg. this.uniqueId)
		this.url = webhookApi.getWebhookBase() + '/' + this._id;
		this._listener = this._onCallback.bind(this);
		webhookApi.registerWebhook(this._id, this._listener);
	},

	_doClose: function() {
		console.log("in do close");
		var webhookApi = this.engine.platform.getCapability('webhook-api');
		webhookApi.unregisterWebhook(this._id, this._listener);
	    },

    	_onCallback: function(method, query, headers, payload) {
		// method is 'GET' or 'POST'
		// query is the parsed version of the stuff after ? in the URL
		// so if the call is ?foo=one&bar=two
		// query is { foo: 'one', bar: 'two' }
		// headers is an object with HTTP headers (lowercase)
		// payload is the parsed request body, usually JSON
		resp = '<Response><Say voice="alice">Good morning. This is your friendly wakeup call.</Say></Response>';
		return { code: 200, response: resp, contentType: 'application/xml' };
   	 }
});
