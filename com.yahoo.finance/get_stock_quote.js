
// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2015 Rick Yan <my259@stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

//http://finance.yahoo.com/d/quotes.csv?s=<NAME>&f=nab
const YAHOO_URL = 'http://finance.yahoo.com/d/quotes.csv';

module.exports = new Tp.ChannelClass({
    Name: 'StockQuoteChannel',

    formatEvent(event, hint, formatter) {
        var id = event[0];
        var name = event[1];
        var ask = event[2];
        var bid = event[3];

        if (hint === 'string-title')
            return "Quote for %s".format(name);
        else if (hint === 'string-body')
            return "Ask %f, bid %f".format(ask, bid);
        else
            return "Quote for %s: ask %f, bid %f".format(name, ask, bid);
    },

    invokeQuery(filters) {
        let companyID = String(filters[0]);
        let url = YAHOO_URL + "?s=" + encodeURIComponent(companyID) + "&f=nab";
        return Tp.Helpers.Http.get(url).then((response) => {
            var csvData = response;
            var csvAry = response.split(",");
            var name = csvAry[0];
            var ask = parseFloat(csvAry[1]);
            var bid = parseFloat(csvAry[2]);
            return [[filters[0], name, ask, bid]];
        });
    },
});


