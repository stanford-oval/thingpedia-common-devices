// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2017 Silei Xu <silei@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');
const URL = 'https://colby.stanford.edu/main/api/bikes/';

module.exports = new Tp.ChannelClass({
    Name: 'GetDetails',

    _init: function _init(engine, device) {
        this.parent();
        this._device = device;
        this.url = URL;
    },

    formatEvent: function formatEvent(event, filters) {
        var details = '';
        event[1].forEach((property) => {
            var key = Object.keys(property)[0];
            var value = property[key];
            details += key + ': ' + value + '\n';
        });
        return [
            details,
            {
                type: 'button',
                text: 'Ask a question',
                json: '{"query":{"name":{"id":"tt:almond_bike_market.ask"},' +
                '"args":[{"name":{"id":"tt:param.id"},"type":"String","value":{"value":"%s"},"operator":"is"}],'.format(event[0]) +
                '"slots":[]}}'
            }
        ];
    },

    invokeQuery: function invokeQuery(filters, env) {
        // filters[0]: post id
        var url = this.url + '/' + filters[0] + '/';
        return Tp.Helpers.Http.get(url).then((data) => {
            var response = JSON.parse(data);
            console.log(response);
            return [[filters[0], response]]
        });
    }
});
