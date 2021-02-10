// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2019-2020 The Board of Trustees of the Leland Stanford Junior University
//
// Redistribution and use in source and binary forms, with or
// without modification, are permitted provided that the following
// conditions are met:
//
// 1. Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above
//    copyright notice, this list of conditions and the following
//    disclaimer in the documentation and/or other materials
//    provided with the distribution.
// 3. Neither the name of the copyright holder nor the names of its
//    contributors may be used to endorse or promote products derived
//    from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
// INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
// SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
// HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
// STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED
// OF THE POSSIBILITY OF SUCH DAMAGE.
//
// Author: James zhuang <james.zhuang@cs.stanford.edu>
"use strict";

const Tp = require('thingpedia');
const URL = "https://www.alphavantage.co/query?function=";
const io = require('socket.io-client');
const server = 'http://localhost:3000';
const moment = require('moment');
const fs = require('fs');
const CONFIG = "./staging/proj.finassistant/config.json";

module.exports = class FinAssistantDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);

        this.name = "Financial Assitant";
        this.description = "Stock information search";
        this.socket = io(server);
        this.socket.emit("tp clear");
        this.clear = false;          //Determines whether to clear the dashboard after each command
        this.cache = {};
        /*
        Config Structure:
        {
            "current":"none",  //Dashboard being edited for multi-dialogue interactions
            "dashboards": {
                "report1": {
                    "companies":["x","y","z"],
                    "charts":["price","revenue","operating income","earnings"]
                },
                "report2": {
                    "companies":[],
                    "charts":[]
                }
            }
        }
        */
        this.config = JSON.parse(fs.readFileSync(CONFIG));
    }

    //Pulls data from AlphaVantage or local cache
    async alphavantage(company, func, config = '&apikey=') {
        if (this.cache[company] == null || this.cache[company][func] == null) {
            let url = `${URL}${func}&symbol=${company}${config}${this.constructor.metadata.auth.api_key}`;
            let result = await Tp.Helpers.Http.get(url);
            result = JSON.parse(result);
            while (result == null) {
                result = await Tp.Helpers.Http.get(url);
                result = JSON.parse(result);
            }
            if (this.cache[company] == null){
                this.cache[company] = {};
                this.cache[company][func] = result;
            } else {
                this.cache[company][func] = result;
            }

            return result;
        } else return this.cache[company][func];

    }

    async pushVisual(type, data) {
        if (this.clear) this.socket.emit("tp clear");
        this.socket.emit(type, data);
    }

    //Gets historical, share split adjusted stock prices
    //Returns prices [x:date, y:value] for visualizations and {display} date:value pairs for thingtalk
    //API: https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=IBM&outputsize=full&apikey=demo

    async prices (company) {
        // let parsed = await this.alphavantage(company, "TIME_SERIES_DAILY_ADJUSTED", "&outputsize=full&apikey=");
        // parsed = parsed["Time Series (Daily)"];
        let parsed = await this.alphavantage(company, "TIME_SERIES_WEEKLY_ADJUSTED", "&outputsize=full&apikey=");
        parsed = parsed["Weekly Adjusted Time Series"];
        let prices = [];
        let display = {};
        for (const date in parsed) {
            // display[date] = parsed[date]["4. close"]; (True historical values)
            display[date] = parsed[date]["5. adjusted close"];
            prices.push({x: moment(date), y: parsed[date]["5. adjusted close"]});
        }
        return {prices: prices, display: display};
    }

    async get_price(company) {
        let parsed = await this.alphavantage(company, "GLOBAL_QUOTE");
        while (parsed == null) parsed = await this.alphavantage(company, "GLOBAL_QUOTE");
        let historical = await this.prices(company);
        //Reverse so that the oldest dates are first (displayed on the right). May no longer be necessary due to using time axis
        this.pushVisual('tp price', {name: company, prices: historical.prices.slice().reverse()});

        while (parsed["Global Quote"] == null) parsed = await this.alphavantage(company, "GLOBAL_QUOTE");
        return [{price: new Tp.Value.Currency(parsed["Global Quote"]["05. price"], 'usd'),
                change: parsed["Global Quote"]["10. change percent"],
                historical: historical.display
                }];
    }

    async market_cap (company) {
        let prices = await this.alphavantage(company, "TIME_SERIES_WEEKLY_ADJUSTED", "&outputsize=full&apikey=");
        prices = prices["Weekly Adjusted Time Series"];

        while(prices == null) {
            prices = await this.alphavantage(company, "TIME_SERIES_WEEKLY_ADJUSTED", "&outputsize=full&apikey=");
            prices = prices["Weekly Adjusted Time Series"];
        }

        let shares = await this.alphavantage(company, "OVERVIEW");
        while (shares == null) shares = await this.alphavantage(company, "OVERVIEW");
        shares = shares.MarketCapitalization/prices[Object.keys(prices)[0]]["5. adjusted close"];

        let chart_data = {name: company, values: []};
        let display = {};
        for (const date in prices) {
            let value = prices[date]["5. adjusted close"]*shares;
            value = value.toFixed(0);
            // let thing = prices[date]["5. adjusted close"];
            display[date] = value;
            chart_data.values.push({x: moment(date), y: value});
        }
        return {chart_data: chart_data, display: display};
    }

    async get_market_cap(company) {
        let parsed = await this.alphavantage(company, "OVERVIEW");
        let historical = await this.market_cap(company);
        this.pushVisual('tp market cap', historical.chart_data);
        return [{market_cap: new Tp.Value.Currency(parsed["MarketCapitalization"], 'usd'), historical: historical.display}];
    }

    //Helper function for formatting % changes
    calc_change(curr, prev, precision=1) {
        if (Math.abs(prev) < 1) return NaN;
        let change = 100*(curr/prev - 1);
        if (prev < 0) change = -change;
        if (Math.abs(change) > 1500) return NaN;      //Number not meaningful
        return change.toFixed(precision);
    }

    //API: https://www.alphavantage.co/query?function=INCOME_STATEMENT&symbol=IBM&apikey=demo
    //Helper function to return data for any line item in income INCOME_STATEMENT
    //Returns: annual date:value pairs, quarterly date:value pairs, and chart_data [x:date, y:value]
    //for quarterly and annual numbers on an absolute and % change basis
    //chart_data: {name: (company),
    //             annual, annual_change, annual_margin, quarterly, quarterly_change, quarterly_margin}
    async pullIncomeStatementItem(company, item, margin="totalRevenue") {
        let parsed = await this.alphavantage(company, "INCOME_STATEMENT");
        while (parsed.annualReports == null) {
            parsed = await this.alphavantage(company, "INCOME_STATEMENT");
        }
        let annual = {};
        let quarterly = {};
        let chart_data = {name: company, annual: [], annual_change: [], annual_margin: [],
                          quarterly: [], quarterly_change: [], quarterly_margin: []};

        let previous = null;
        //slice() first to prevent mutating our cache
        parsed.annualReports.slice().reverse().forEach(obj => {
            let date = obj.fiscalDateEnding;
            let revenue = obj[margin];
            let lineItem = obj[item];
            annual[date] = lineItem;
            if (previous != null)
                chart_data.annual_change.push({x: moment(date), y: this.calc_change(lineItem, previous)});
            previous = lineItem;
            chart_data.annual.push({x: moment(date), y: lineItem});
            chart_data.annual_margin.push({x: moment(date), y: (lineItem/revenue * 100).toFixed(1)});
        });

        previous = [];
        parsed.quarterlyReports.slice().reverse().forEach(obj => {
            let date = obj.fiscalDateEnding;
            let revenue = obj[margin];
            let lineItem = obj[item];
            quarterly[date] = lineItem;
            if (previous.length > 3)
                chart_data.quarterly_change.push({x: moment(date), y: this.calc_change(lineItem, previous.shift())});
            previous.push(lineItem);
            chart_data.quarterly.push({x: moment(date), y: lineItem});
            chart_data.quarterly_margin.push({x: moment(date), y: (lineItem/revenue * 100).toFixed(1)});
        });
        return {annual: annual, quarterly: quarterly, chart_data: chart_data};
    }

    async getValuation(company, type) {
        let market_cap = await this.market_cap(company);
        market_cap = market_cap.display;
        let metric = await this.pullIncomeStatementItem(company, type);
        while(metric == null) {
            metric = await this.pullIncomeStatementItem(company, type);
        }

        let chart_data = {name: company, values: [], debug: [], metric: metric.quarterly};
        let display = {};
        let fy_dates = [];
        for (const date in metric.quarterly) {
            fy_dates.push(date);
        }
        fy_dates = fy_dates.slice().reverse(); // Reverse order so most recent is first

        //Starts with most recent
        for (const date in market_cap) {
            let price = market_cap[date];
            let d = moment(date);
            // starts from most recent
            let updated = 0;
            let TTM_metric = 0;
            let ttm_dates = "";
            for (let i = 0; i < fy_dates.length; ++i) {
                if (d.isAfter(fy_dates[i])) {
                    ttm_dates += " "+fy_dates[i]+" ";
                    TTM_metric += Number(metric.quarterly[fy_dates[i]]);
                    updated += 1;
                }
                if (updated == 4) break;
            }
            if (updated != 4) break;
            else {
                chart_data.debug.push({date: d, price: price, ttm: TTM_metric, ttm_dates:ttm_dates});
                let ratio = price/TTM_metric;
                ratio = ratio.toFixed(2);
                chart_data.values.push({x: d, y: ratio});
                display[date] = ratio;
                updated = true;
            }
        }
        return {chart_data: chart_data, display: display};
    }

    async get_pe(company) {
        let results = await this.getValuation(company, 'netIncomeFromContinuingOperations');
        this.pushVisual("tp pe", results.chart_data);

        let parsed = await this.alphavantage(company, "OVERVIEW");
        let current_pe = parsed["PERatio"];
        return [{pe: current_pe, historical: results.display}];
    }

    async get_ps(company) {
        let results = await this.getValuation(company, 'totalRevenue');
        this.pushVisual("tp ps", results.chart_data);

        let parsed = await this.alphavantage(company, "OVERVIEW");
        let current_ps = parsed["PriceToSalesRatioTTM"];
        return [{ps: current_ps, historical: results.display}];
    }

    async get_revenue(company) {
        let results = await this.pullIncomeStatementItem(company, "totalRevenue");
        this.pushVisual('tp revenue', results.chart_data);
        return [{revenue: new Tp.Value.Currency(results.chart_data.annual.slice().reverse()[0].y, 'usd'), annual: results.annual, quarterly: results.quarterly}];
    }

    async get_earnings(company) {
        let results = await this.pullIncomeStatementItem(company, "netIncomeFromContinuingOperations");
        this.pushVisual('tp earnings', results.chart_data);
        return [{earnings: new Tp.Value.Currency(results.chart_data.annual.slice().reverse()[0].y, 'usd'),annual: results.annual, quarterly: results.quarterly}];
    }

    async get_ebitda(company) {
        let parsed = await this.alphavantage(company, "OVERVIEW");
        return [{ebitda: new Tp.Value.Currency(parsed["EBITDA"], 'usd')}];
    }
    async get_operating_profit(company) {
        let results = await this.pullIncomeStatementItem(company, "operatingIncome");
        this.pushVisual('tp operating profit', results.chart_data);
        return [{earnings: new Tp.Value.Currency(results.chart_data.annual.slice().reverse()[0].y, 'usd'),annual: results.annual, quarterly: results.quarterly}];
    }

    async get_gross_profit(company) {
        let results = await this.pullIncomeStatementItem(company, "grossProfit");
        this.pushVisual('tp gross profit', results.chart_data);
        return [{earnings: new Tp.Value.Currency(results.chart_data.annual.slice().reverse()[0].y, 'usd'),annual: results.annual, quarterly: results.quarterly}];
    }

    /*
    Saves user outlined dashboard to file system.

        Structure of data:
        {
            name: name
            companies: [comp1, comp2]
            charts: [chart1, chart2]
        }
    */
    async get_create_report(data) {
        this.config.dashboards[data.name] = {companies: data.companies, charts: data.charts};
        fs.writeFile(CONFIG, JSON.stringify(this.config), err => {});
        return [{name: data.name, companies: this.config.dashboards[data.name].companies, charts: this.config.dashboards[data.name].charts}];
    }

    //Calls the appropriate function given a string representing a chart
    async translate_command(company, chart) {
        if (chart === "price") {
            await this.get_price(company);
        } else if (chart === "market cap") {
            await this.get_market_cap(company);
        } else if (chart === "revenue") {
            await this.get_revenue(company);
        } else if (chart === "earnings") {
            await this.get_earnings(company);
        } else if (chart === "operating profit") {
            await this.get_operating_profit(company);
        } else if (chart === "gross profit") {
            await this.get_gross_profit(company);
        } else if (chart === "pe ratio") {
            await this.get_pe(company);
        } else if (chart === "ps ratio") {
            await this.get_ps(company);
        }
    }

    //Loads and displays user defined report
    async get_display_report(name) {
        this.clear = false;
        this.socket.emit("tp clear");

        /*
            Structure of data:
            { companies: [comp1, comp2]
              charts: [chart1, chart2] }
        */
        let data = this.config.dashboards[name];
        if (data == null) return [{name: name, error: "Does not exist"}];
        for (let i = 0; i < data.charts.length; ++i)
            for (let j = 0; j < data.companies.length; ++j)
                await this.translate_command(data.companies[j], data.charts[i]);

        this.clear = true;
        return [{name: name, charts: data.charts, companies: data.companies}];
    }
};
