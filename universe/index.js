// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of vikram.hello
//
// Copyright 2021 undefined Vikram Nagapudi
//                          vikramnagapudi2004@gmail.com
// See LICENSE for details
"use strict";
const Tp = require("thingpedia");

const tmdbAccess = "https://api.themoviedb.org/3/";
const multiSearch = "search/multi?api_key="
const movieSearch = "search/movie?api_key=";
const finalSearch = "&language=en-US&page=1";
const topRated = "movie/top_rated?api_key=";
const nowPlaying = "movie/now_playing?api_key=";

module.exports = class MovieClass extends Tp.BaseDevice {
    //constructor taken from Yelp index.js
    constructor(engine, state){
        super(engine, state);
        this.uniqueId = "vikram.hello";
    }

    get_movie (params, hints, env) {
        // const queryURL = tmdbAccess + multiSearch + this.constructor.metadata.auth.api_key + finalSearch + realquery + "&page=1&include_adult=false";
        const sortURL = '';
        if (hints && hints.sort) {
            if (hints.sort[0] === 'release_date' && hints.sort[1] === 'desc')
                sortURL = tmdbAccess + nowPlaying + this.constructor.metadata.auth.api_key + finalSearch;
            else if (hints.sort[0] === 'rating_score' && hints.sort[1] === 'desc')
                sortURL = tmdbAccess + topRated + this.constructor.metadata.auth.api_key + finalSearch;
        }
        if (sortURL) {
            return Tp.Helpers.Http.get(sortURL).then((response) => {
                let parsedResponse = JSON.parse(response);
                return parsedResponse.webPages.value.map((result) => {
                    const id = new Tp.Value.Entity(result.title);
                    return ({
                        id,
                        description: result.overview,
                        release_date: result.release_date,
                        rating_score: result.vote_average,
                    });
                });
            });
        }
        const query_term = '';
        const searchType = '';
        if (hints && hints.filter) {
            for (let [pname, op, value] of hints.filter) {
                if (pname === 'id' && (op === '==' || op === '=~')) {
                    if (value instanceof Tp.Value.Entity)
                        query_term = value.display.replace(' ', '%20');
                    else 
                        query_term = value; 
                }
                else if (pname === 'actors' && (op === '==' || op === '=~')) {
                    query_term = value.replace(' ', '%20');
                    searchType = 'actor';
                }
                
            }
        }
        if (!query_term)
            query_term = 'Movie';
        const multiQuery = tmdbAccess + multiSearch + this.constructor.metadata.auth.api_key + 'language=en-US&query=${query_term}&page=1%include_adult=false';
        return Tp.Helpers.Http.get(multiQuery).then((response) => {
            let parsedResponse = JSON.parse(response);
            return parsedResponse.webPages.value.map((result) => {
                
                if (searchType){
                    const id = new Tp.Value.Entity(result.known_for.title)
                    return ({
                        id,
                        description: result.known_for.overview,
                        release_date: result.known_for.release_date,
                        rating_score: result.known_for.vote_average,
                    });
                }
                else {
                    const id = new Tp.Value.Entity(result.title);
                    return ({
                        id,
                        description: result.known_for.overview,
                        release_date: result.known_for.release_date,
                        rating_score: result.known_for.vote_average,
                        });
                }
            });
        });
    }
}


