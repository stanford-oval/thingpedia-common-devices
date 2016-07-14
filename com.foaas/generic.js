// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

module.exports = function(what, baseUrl, nargs) {
    return new Tp.ChannelClass({
        Name: 'FoaasChannel' + what,

        invokeQuery: function(filters) {
            var params = filters.slice(0, nargs);
            if (params.some(function(p) { return p === null || p === undefined; }))
                throw new Error('Invalid parameters to ' + this.__name__);
            var url = String.prototype.format.apply('https://www.foaas.com' + baseUrl, params.map(function(p) {
                return encodeURIComponent(p);
            }));

            return Tp.Helpers.Http.get(url, {accept: 'application/json'}).then(function(response) {
                var parsed = JSON.parse(response);
                return [params.concat([parsed.message, parsed.subtitle])];
            });
        }
    });
}
