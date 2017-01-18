// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Rick Yan <my259@stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

//http://finance.yahoo.com/d/quotes.csv?s=<NAME>&f=nab
const YAHOO_URL = 'http://download.finance.yahoo.com/d/quotes.csv';
const POLL_INTERVAL = 30 * 1000; // 30s

module.exports = new Tp.ChannelClass({
    Name: 'StockDividendChannel',
    Extends: Tp.HttpPollingTrigger,

    _init: function(engine, device, params) {
        this.parent();

        this._params = params;
        this._myCompanyID = this._params[0];
        if (!this._myCompanyID)
            throw new TypeError("Missing required parameters");

        this.interval = POLL_INTERVAL;
        this.url = YAHOO_URL + "?s=" + encodeURIComponent(this._myCompanyID) + "&f=nydr1q";
    },

    formatEvent(event, hint, formatter) {
        var id = event[0];
        var name = event[1];
        var _yield = event[2];
        var div = event[3];
        var payDate = event[4];
        var exDivDate = event[5];

        // I have very little clue of what this means
        // so I'll just format like this
        //   -- gcampax
        if (hint === 'string-title')
            return "Dividend for %s".format(name);
        else if (hint === 'string-body')
            return "Yield %f, per share %f, pay date %s, ex-dividend date %s"
                .format(_yield, div, payDate, exDivDate);
        else
            return "Dividend for %s: yield %f, per share %f, pay date %s, ex-dividend date"
                .format(name, _yield, div, payDate, exDivDate);
    },

    _onResponse(response) {
        if (!response)
            return;
        var csvAry = response.split(",");
        console.log(response);
        console.log(csvAry);
        console.log(csvAry[3], csvAry[4]);

        // yield is a reserved word in JS
        var name = csvAry[0];
        var _yield = parseFloat(csvAry[1]);
        var div = parseFloat(csvAry[2]);
        var payDate = Date.parse(csvAry[3]);
        var exDivDate = Date.parse(csvAry[4]);

        console.log(payDate, exDivDate);

        this.emitEvent([this._myCompanyID, name, _yield, div, payDate, exDivDate]);
    },
});


