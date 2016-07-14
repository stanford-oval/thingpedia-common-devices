// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2015 Benjamin Schwartz <bschwart@stanford.edu>, Senthil Nathan <svnathan@stanford.edu>
// See LICENSE for details
//

const Tp = require('thingpedia');

module.exports = new Tp.ChannelClass({
    Name: 'TwitterDMSinkChannel',

    _init: function(engine, device) {
        this.parent();

        this._twitter = device.queryInterface('twitter');
    },

    sendEvent: function(event) {
        console.log('Sending Twitter direct message', event);

        var to = event[0];
        var msg = event[1];
        this._twitter.sendDirectMessage({ screen_name: to, text: msg }, function(err) {
            console.log('Sending direct message failed: ' + err);
        }, function() { });
    },
});
