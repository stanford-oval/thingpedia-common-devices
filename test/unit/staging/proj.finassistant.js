// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2020 James Zhuang <james.zhuang@stanford.edu>
//
// See LICENSE for details
"use strict";

const assert = require('assert');
const Tp = require('thingpedia');
const com = ['AAPL', 'AMZN', 'MSFT'];
const all_charts = ["price", "market cap", "ps ratio", "pe ratio", "revenue", "gross profit", "operating profit", "earnings"];
// const com = ['DDOG', 'TDOC', 'FSLY'];

module.exports = [

    // // -- Show me the stock price for "____"
    // ['query', 'price', com[0], (result) => {
    //     console.log(result);
    // }],
    //
    // ['query', 'price', com[1], (result) => {
    // }],
    //
    // ['query', 'price', com[2], (result) => {
    // }],
    //
    // // -- What is the market cap of "____"
    // ['query', 'market_cap', com[0], (result) => {
    //     console.log(result);
    // }],
    //
    // ['query', 'market_cap', com[1], (result) => {
    //     console.log(result);
    // }],
    //
    // ['query', 'market_cap', com[2], (result) => {
    //     console.log(result);
    // }],
    //
    // // -- What is the price sales ratio of "____"
    // ['query', 'ps', com[0], (result) => {
    //     console.log(result);
    // }],
    //
    // ['query', 'ps', com[1], (result) => {
    //     console.log(result);
    // }],
    //
    // ['query', 'ps', com[2], (result) => {
    //     console.log(result);
    // }],
    //
    // // -- What is the price sales ratio of "____"
    // ['query', 'pe', com[0], (result) => {
    //     console.log(result);
    // }],
    //
    // ['query', 'pe', com[1], (result) => {
    //     console.log(result);
    // }],
    //
    // ['query', 'pe', com[2], (result) => {
    //     console.log(result);
    // }],
    //
    // ['query', 'revenue', com[0], (result) => {
    //     console.log(result);
    // }],
    //
    // ['query', 'revenue', com[1], (result) => {
    //     console.log(result);
    // }],
    //
    // ['query', 'revenue', com[2], (result) => {
    //     console.log(result);
    // }],
    //
    // ['query', 'gross_profit', com[0], (result) => {
    //     console.log(result);
    // }],
    //
    // ['query', 'gross_profit', com[1], (result) => {
    //     console.log(result);
    // }],
    //
    // ['query', 'gross_profit', com[2], (result) => {
    //     console.log(result);
    // }],
    //
    // ['query', 'operating_profit', com[0], (result) => {
    //     console.log(result);
    // }],
    //
    // ['query', 'operating_profit', com[1], (result) => {
    //     console.log(result);
    // }],
    //
    // ['query', 'operating_profit', com[2], (result) => {
    //     console.log(result);
    // }],
    //
    // ['query', 'ebitda', com[0], (result) => {
    //     console.log(result);
    // }],
    //
    // ['query', 'earnings', com[0], (result) => {
    //     console.log(result);
    // }],
    //
    // ['query', 'earnings', com[1], (result) => {
    //     console.log(result);
    // }],
    //
    // ['query', 'earnings', com[2], (result) => {
    //     console.log(result);
    // }],


    // ------------ Creating and Displaying Reports --------------
    // ['query', 'display_report', "showcase", (result) => {
    //     console.log(result);
    // }],

    ['query', 'display_report', "showcase", (result) => {
        console.log(result);
    }],

    // ['query', 'create_report', {name: "cars", companies: ["TSLA", "GM", "RACE", "F"], charts: ["market cap", "ps ratio", "pe ratio", "revenue", "earnings"]}, (result) => {
    //     console.log(result);
    // }],
    //
    // ['query', 'display_report', "cars", (result) => {
    //     console.log(result);
    // }],
    //
    // ['query', 'create_report', {name: "showcase", companies: ["ZM"], charts: all_charts}, (result) => {
    //     console.log(result);
    // }],

];
