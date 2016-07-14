// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Luke Hsiao & Jeff Setter
//

const Tp = require('thingpedia');


module.exports = new Tp.ChannelClass({
    Name: 'SlackSetPresenceChannel',

    _init: function(engine, device) {
        this.parent();
        this.device = device;
    },

    sendEvent: function(event) {
        var token = this.device.accessToken;
        var presence = event[0];
        if (presence !== 'auto' && presence !== 'away') {
            console.log("[ERROR] User tried to set presence as ", presence);
            return;
        }

        // Construct the proper JSON message and send to channel
        Tp.Helpers.Http.post('https://slack.com/api/users.setPresence',
            'token=' + token +
            '&presence=' + encodeURIComponent(presence), {
              dataContentType: 'application/x-www-form-urlencoded'
            }).then(function(response) {
                var parsed = JSON.parse(response);
                if (!parsed.ok) {
                console.log('[ERROR] invalid response from http POST');
                }
            }, function(reason) {
                console.log('[info] Reason: ', String(reason));
                console.log('[ERROR] Unable to set presence');
            }).done();
    },
});
