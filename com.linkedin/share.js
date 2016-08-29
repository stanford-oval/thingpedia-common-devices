// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

const URL = 'https://api.linkedin.com/v1/people/~/shares?format=json';
const INDUSTRIES = require('./industries.json');

module.exports = new Tp.ChannelClass({
    Name: 'LinkedinShareChannel',

    _init: function(engine, device) {
        this.parent();
        this.device = device;
    },

    sendEvent(event) {
        var comment = event[0];

        return Tp.Helpers.Http.post(URL, JSON.stringify({
            comment: comment,
            visibility: {
                code: 'anyone'
            }
        }), {
            useOAuth2: this.device,
            accept: 'application/json'
        });
    }
});
