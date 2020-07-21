// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2018 Matthew Millican <millimat@stanford.edu>
//
// See COPYING for details
"use strict";

const Tp = require('thingpedia');

// API key is limited to 1000 requests per month, so this may break if many users
// make commands. Possible solutions: have each user configure API key; or contact
// WolframAlpha for a single "heavy-duty" API key
const WOLFRAMALPHA_FULLRESULTS_BASE_URL = 'http://api.wolframalpha.com/v2/query?appid=KTH6UG-V7V2XWRL3H';

module.exports = class WolframAlpha extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'com.wolframalpha';
        this.name = 'WolframAlpha';
        this.description = "Query the WolframAlpha engine.";
    }

    get_plot({ query }) {
        let url = WOLFRAMALPHA_FULLRESULTS_BASE_URL;
        let format_args = ['&output=json',
                           '&includepodid=Plot',
                           '&includepodid=3DPlot',
                           '&includepodid=ContourPlot'];
        url += '&input=' + encodeURIComponent(query) + format_args.join('');

        return Tp.Helpers.Http.get(url).then((response) => {
            var parsed = JSON.parse(response);
            var purl = '';

            if (parsed.queryresult.numpods > 0) { // At least one result returned
                purl = parsed.queryresult.pods[0].subpods[0].img.src;
            }

            return [{picture_url: purl}];
        });
    }
};