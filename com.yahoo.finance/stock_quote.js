
// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2015 Rick Yan <my259@stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

//http://finance.yahoo.com/d/quotes.csv?s=<NAME>&f=nab
const YAHOO_URL = 'http://finance.yahoo.com/d/quotes.csv';
const POLL_INTERVAL = 30 * 1000; // 30s

module.exports = new Tp.ChannelClass({
    Name: 'StockQuoteChannel',
    Extends: Tp.HttpPollingTrigger,

    _init: function(engine, device, params) {
        this.parent();

        this._params = params;
        this._myCompanyID = this._params[0];
        if (!this._myCompanyID)
            throw new TypeError("Missing required parameters");

        this.interval = POLL_INTERVAL;
        this.url = YAHOO_URL + "?s=" + encodeURIComponent(this._myCompanyID) + "&f=nab";
    },

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

    _onResponse(response) {
        if (!response)
            return;

        var csvData = response;
        var csvAry = response.split(",");
        var name = csvAry[0];
        var ask = parseFloat(csvAry[1]);
        var bid = parseFloat(csvAry[2]);
        this.emitEvent([this._myCompanyID, name, ask, bid]);
    },
});


