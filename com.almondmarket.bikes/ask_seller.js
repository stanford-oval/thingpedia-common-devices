// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2017 Silei Xu <silei@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');
const Q = require('q');
const URL = 'https://colby.stanford.edu/main/api/bikes/';

module.exports = new Tp.ChannelClass({
    Name: 'AskSeller',

    _init: function _init(engine, device) {
        this.parent();
        this._device = device;
        this.url = URL;
    },

    formatEvent: function formatEvent(event, filters) {
        // essentially an action, but in query form.
        return ['Consider it done.'];
    },

    invokeQuery: function invokeQuery(filters, env) {
        // filters[0]: id, filters[1]: property, filter[2]: value, filter[3]: public
        var url = this.url;
        if (filters[3] === true) {
            var data = JSON.stringify({ id: filters[0], info: filters[1] + '=' + filters[2]});
            Tp.Helpers.Http.post(url, data, {
                dataContentType: 'application/json',
                accept: 'application/json',
                extraHeaders: { 'Content-Length': Buffer.byteLength(data) }
            }).catch(function(error) {
                console.error('Error posting on Almond Bike Market: ' + error.message);
            });
        }
        return Tp.Helpers.Http.get(url).then((data) => {
            return [filters];
        });
    }
});
