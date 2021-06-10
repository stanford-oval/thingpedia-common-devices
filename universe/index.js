// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of vikram.hello
//
// Copyright 2021 undefined <undefined>
//
// See LICENSE for details
"use strict";
const Tp = require("thingpedia");
const querystring = require("querystring");
const assert = require('assert');

const tmdbAccess = "https://api.themoviedb.org/3/";
const movieSearch = "search/movie?api_key=654083fa9e049ea234e4ae94d3e65774&language=en-US&query=";

module.exports = class MovieClass extends Tp.BaseDevice {
    //constructor taken from Yelp index.js
    constructor(engine, state){
        super(engine, state);
        this.uniqueId = "vikram.hello";
        this._queryResults = new Map();
        this._deviceState = new Map ();
    }
    get_movieinfo(query) {
        const realquery = query;
        const queryURL = tmdbAccess + movieSearch + realquery + "&page=1&include_adult=false";
        return Tp.Helpers.Http.get(queryURL).then((response) => {
            const parsedResponse = JSON.parse(response);
            return parsedResponse;
        });      
    }

    get_realmovie (query) {
        const realquery = query;
        const queryURL = tmdbAccess + movieSearch + realquery + "&page=1&include_adult=false";
        return Tp.Helpers.Http.get(queryURL).then((response) => {
            let parsedResponse = JSON.parse(response);
            return parsedResponse.webPages.value.map((result) => {
                return ({
                    query: query,
                    title: result[0].original_title,
                    description: result[0].overview,
                });
            });
        });
    }
}


