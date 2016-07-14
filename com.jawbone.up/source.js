// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

module.exports = function(what, hook, formatter) {
    return new Tp.ChannelClass({
        Name: 'JawboneChannel' + what,
        RequiredCapabilities: ['webhook-api'],

        _init: function(engine, device) {
            this.parent();
            this.device = device;

            this._baseurl = 'https://jawbone.com/nudge/api/v.1.1/' + what + '/';
            this.url = this._baseurl;
        },

        get auth() {
            return "Bearer " + this.device.accessToken;
        },

        _doOpen: function() {
            return this.device.registerWebhook(hook, this);
        },

        _doClose: function() {
            return this.device.unregisterWebhook(hook);
        },

        onHook: function(eventXid) {
            Tp.Helpers.Http.get(this._baseurl + eventXid, { auth: this.auth }).then(function(response) {
                return this._onResponse(response);
            }.bind(this)).catch(function(error) {
                console.error('Error reading from upstream server: ' + error.message);
                console.error(error.stack);
            }).done();
        },

        _onResponse: function(response) {
            var parsed;
            try {
                parsed = JSON.parse(response);
            } catch(e) {
                console.log('Error parsing Jawbone server response: ' + e.message);
                console.log('Full response was');
                console.log(response);
                return;
            }

            this.emitEvent(formatter(parsed.data));
        }
    });
}
