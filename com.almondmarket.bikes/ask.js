// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2017 Silei Xu <silei@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');
const URL = 'https://colby.stanford.edu/main/api/bikes/';

module.exports = new Tp.ChannelClass({
    Name: 'AskQuestion',

    _init: function _init(engine, device) {
        this.parent();
        this._device = device;
        this.url = URL;
    },

    formatEvent: function formatEvent(event, filters) {
        if (event[1] === null)
            return [
                'Sorry, I don\'t understand.',
                {
                    type: 'button',
                    text: 'Ask another question',
                    json: '{"query":{"name":{"id":"tt:almond_bike_market.ask"},' +
                    '"args":[{"name":{"id":"tt:param.id"},"type":"String","value":{"value":"%s"},"operator":"is"}],'.format(filters[0]) +
                    '"slots":[]}}'
                }
            ];
        if (event[2].length > 0)
            return [
                'The %s of the bike is: '.format(event[1]) + event[2].join(' '),
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
                    json: '{"rule": {' +
                    '"query":{"name":{"id":"tt:almond_bike_market.ask_seller"}, "args":[' +
                    '{"name":{"id":"tt:param.id"},"type":"String","value":{"value":"%s"},"operator":"is"},'.format(filters[0]) +
                    '{"name":{"id":"tt:param.property"},"type":"String","value":{"value":"%s"},"operator":"is"}'.format(filters[1]) +
                    '], "remoteSlots":["value", "public"], "person":"%s"}, '.format(event[3][0]) +
                    '"action":{"name":{"id":"tt:builtin.notify"}, "args":[' +
                    '{"name":{"id":"tt:param.message"},"type":"VarRef","value":{"id":"tt:param.answer"},"operator":"is"}' +
                    ']}}}'
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
        // filters[0]: poster_id, filter[1]: property name / natural language query
        var url = this.url + filters[0];
        if (filters[1].indexOf(' ') === -1) {
            return Tp.Helpers.Http.get(url + '/?property=' + filters[1]).then((data) => {
                return Tp.Helpers.Http.get(url + '/?property=poster').then((poster) => {
                    return [[filters[0], filters[1], JSON.parse(data), JSON.parse(poster)]];
                });
            });
        } else {
            var q = filters[1].split(' ').join('+');
            return Tp.Helpers.Http.get(url + '/?query=' + q).then((data) => {
                data = JSON.parse(data);
                if (data.length === 0)
                    return [[filters[0], null, null, null]];
                return Tp.Helpers.Http.get(url + '/?property=poster').then((poster) => {
                    var property = data[0];
                    var value = data[1];
                    return [[filters[0], property, [value], JSON.parse(poster)]];
                });
            });
        }
    }
});
