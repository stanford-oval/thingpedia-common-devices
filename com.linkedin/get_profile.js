// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

const URL = 'https://api.linkedin.com/v1/people/~:(id,formatted-name,headline,industry,specialties,positions,picture-url)?format=json';
const INDUSTRIES = require('./industries.json');

module.exports = new Tp.ChannelClass({
    Name: 'LinkedinGetProfileChannel',

    _init: function(engine, device) {
        this.parent();
        this.device = device;
    },

    formatEvent(event) {
        var name = event[0];
        var headline = event[1];
        var industry = event[2];
        var specialties = event[3];
        var positions = event[4];
        var pictureUrl = event[5];

        return [name, { type: 'picture', url: pictureUrl },
                headline,
                "Works in %s".format(industry)];
    },

    invokeQuery(filters) {
        return Tp.Helpers.Http.get(URL, {
            useOAuth2: this.device,
            accept: 'application/json' }).then((response) => {
            var parsed = JSON.parse(response);
            console.log('parsed', parsed);

            return [[parsed.formattedName,
                     parsed.headline,
                     parsed.industry,
                     parsed.specialties,
                     parsed.positions.values.map((p) => p.summary),
                     parsed.pictureUrl]];
        });
    }
})
