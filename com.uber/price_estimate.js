// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Juan Vimberg <jvimberg@stanford.edu>
//                Tucker L. Ward <tlward@stanford.edu>
//                Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');
const Url = require('url');
const common = require('./common.js');

const CURRENCIES = require('./currencies.json');

var BASE_URL = 'https://api.uber.com/v1/';
var ACTION_GET_PRICE_EST = "estimates/price";

module.exports = new Tp.ChannelClass({
    Name: "UberPriceInformationChannel",

    formatEvent(event) {
        var start = event[0];
        var end = event[1];
        var name = event[2];
        var low = event[3];
        var high = event[4];
        var currency = event[5] in CURRENCIES ? CURRENCIES[event[5]] : event[5];
        var surge = event[6];
        var duration = event[7];
        var distance = event[8];

        return "Estimate for %s: between %s%f and %s%f (%.1fx surge). Distance: %.1f km, Time: %.0f min".
            format(name, currency, low, currency, high, surge, distance / 1000, duration / 60000);
    },

    invokeQuery(filters) {
        var start = filters[0];
        var end = filters[1];

        var url = Url.parse(BASE_URL + ACTION_GET_PRICE_EST);
        url.search = undefined;
        url.query = {
            start_latitude: start.y,
            start_longitude: start.x,
            end_latitude: end.y,
            end_longitude: end.x
        };

        return common.get(Url.format(url)).then(function(response) {
            return response.prices.map(function(price) {
                if (price.low_estimate === null || price.high_estimate === null)
                    return null;
                return [filters[0], filters[1],
                    price.display_name,
                    price.low_estimate,
                    price.high_estimate,
                    price.currency_code,
                    price.surge_multiplier,
                    price.duration * 1000, // convert to milliseconds
                    price.distance * 1609.34]; // convert miles to meters
            }).filter((p) => p !== null);
        });
    }
});
