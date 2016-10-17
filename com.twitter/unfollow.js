// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2015 Giovanni Campagna
//

const Tp = require('thingpedia');

// a fixed version of postCustomApiCall that does not append
// the parameters to the url (which would break OAuth)
function postCustomApiCall (url, params, error, success) {
    var path =  url;
    var url = this.baseUrl + path;
    this.doPost(url, params, error, success);
};

module.exports = new Tp.ChannelClass({
    Name: 'TwitterFollowChannel',

    _init: function(engine, device) {
        this.parent();

        this._twitter = device.queryInterface('twitter');
    },

    sendEvent: function(event) {
        console.log('Unfollowing Twitter user', event);

        var username = event[0];
        return new Promise((callback, errback) => {
            return postCustomApiCall.call(this._twitter, '/friendships/destroy.json', { screen_name: username }, errback, callback);
        }).catch((e) => {
            if (e.statusCode && e.data) {
                // OAuth.js style error
                if (e.statusCode === 403) {
                    // duplicate friendship, eat the error
                    return;
                }

                console.error('Unexpected HTTP error', e.data);
                throw new Error('Unexpected HTTP error ' + e.statusCode);
            } else {
                throw e;
            }
        });
    },
});
