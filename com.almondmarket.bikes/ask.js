// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2017 Silei Xu <silei@cs.stanford.edu>
//
// See LICENSE for details

var Tp = require('thingpedia');
var URL = 'https://colby.stanford.edu/main/api/bikes/';

module.exports = new Tp.ChannelClass({
    Name: 'AskQuestion',

    _init: function _init(engine, device) {
        this.parent();
        this._device = device;
        this.url = URL;
    },

    formatEvent: function formatEvent(event, filters) {
        if (event[2].length > 0)
            return [
                event[2].join(' '),
                {
                    type: 'button',
                    text: 'Ask another question',
                    json: '{"query":{"name":{"id":"tt:almond_bike_market.ask"},' +
                    '"args":[{"name":{"id":"tt:param.id"},"type":"String","value":{"value":"%s"},"operator":"is"}],'.format(filters[0]) +
                    '"slots":[]}}'
                }

            ];
        else
            return [
                'Can\'t find information about %s.'.format(filters[1]),
                {
                    type: 'button',
                    text: 'Ask seller',
                    json: '{"action":{"name":{"id":"tt:almond_bike_market.answer"}, "args":[' +
                    '{"name":{"id":"tt:param.id"},"type":"String","value":{"value":"%s"},"operator":"is"},' .format(filters[0]) +
                    '{"name":{"id":"tt:param.property"},"type":"String","value":{"value":"%s"},"operator":"is"}' .format(filters[1]) +
                    '], "slots":["__person"], "remoteSlots":["value"], "person":"%s"}}'.format(event[3][0])
                },
                {
                    type: 'button',
                    text: 'Ask another question',
                    json: '{"query":{"name":{"id":"tt:almond_bike_market.ask"},' +
                    '"args":[{"name":{"id":"tt:param.id"},"type":"String","value":{"value":"%s"},"operator":"is"}],'.format(filters[0]) +
                    '"slots":[]}}'
                }
            ];
    },

    invokeQuery: function invokeQuery(filters, env) {
        // filters[0]: poster_id, filter[1]: property name
        var url = this.url + filters[0] + '/?property=';
        console.log(url);
        return Tp.Helpers.Http.get(url + filters[1]).then((data) => {
            return Tp.Helpers.Http.get(url + 'poster').then((poster) => {
                return [[filters[0], filters[1], JSON.parse(data), JSON.parse(poster)]];
            })
        });
    }
});
