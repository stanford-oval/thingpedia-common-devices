// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Rick Yan <my259@stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');
const csv = require('csv');

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

        this.filterString = String(this._myCompanyID)
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
                .format(_yield, div, 
                        formatter.dateToString(payDate), 
                        formatter.dateToString(exDivDate));
        else
            return "Dividend for %s: yield %f, per share %f, pay date %s, ex-dividend date %s"
                .format(name, _yield, div, 
                        formatter.dateToString(payDate), 
                        formatter.dateToString(exDivDate));
    },

    _onResponse(response) {
        if (!response)
            return;
        self = this;
        csv.parse(response, function(err, data){
            var name = data[0][0];
            var _yield = parseFloat(data[0][1]);
            var div = parseFloat(data[0][2]);
            var payDate = new Date(data[0][3]);
            var exDivDate = new Date(data[0][4]);
            self.emitEvent([self._myCompanyID, name, _yield, div, payDate, exDivDate]);
        });

    },
});


