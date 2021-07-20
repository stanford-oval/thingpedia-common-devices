// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of vikram.hello
//
// Copyright 2021 undefined Vikram Nagapudi
//                          vikramnagapudi2004@gmail.com
// See LICENSE for details
"use strict";
const Tp = require('thingpedia');


const tmdbAccess = "https://api.themoviedb.org/3/";
const multiSearch = "search/multi?api_key=";
const discoverSearch = 'discover/movie?api_key=';
const finalSearch = "&language=en-US&page=1";
const topRated = "movie/top_rated?api_key=";
const nowPlaying = "movie/now_playing?api_key=";


module.exports = class MovieClass extends Tp.BaseDevice {
    async get_movie (params, hints, env) {
        // const queryURL = tmdbAccess + multiSearch + this.constructor.metadata.auth.api_key + finalSearch + realquery + "&page=1&include_adult=false";
        let sortURL = '';
        if (hints && hints.sort) {
            if (hints.sort[0] === 'release_date' && hints.sort[1] === 'desc')
                sortURL = tmdbAccess + nowPlaying + this.constructor.metadata.auth.api_key + finalSearch;
            else if (hints.sort[0] === 'rating_score' && hints.sort[1] === 'desc')
                sortURL = tmdbAccess + topRated + this.constructor.metadata.auth.api_key + finalSearch;
        }
        if (sortURL) {
            const response1 = await Tp.Helpers.Http.get(sortURL);
            let parsedResponse = JSON.parse(response1);
            return Promise.all(parsedResponse.results.map(async (result) => {
                const castQuery = `https://api.themoviedb.org/3/movie/${result.id}/credits?api_key=${this.constructor.metadata.auth.api_key}&language=en-US`;
                let id = new Tp.Value.Entity(String(result.id), result.title);
                let oneDate = new Date(Date.now());
                if ((result.release_date !== undefined) && (String(result.release_date) !== ''))
                    oneDate = new Date(result.release_date);
                const movieObj = {
                    id,
                    description: result.overview,
                    release_date: oneDate,
                    rating_score: Number(result.vote_average),
                    actors:[]
                };
                try{
                    const actorResponse = await Tp.Helpers.Http.get(castQuery);
                    const actorsParsed = JSON.parse(actorResponse);
                    for (const person1 of (actorsParsed.cast))
                        movieObj.actors.push(new Tp.Value.Entity(String(person1.id), person1.name));
                }
                catch(err){
                    console.log("Information for one actor could not be found...");
                }
                return movieObj;
            }));
        }
        let query_term = '';
        let searchType = 'movie';
        if (hints && hints.filter) {
            for (let [pname, op, value] of hints.filter) {
                if (pname === 'id' && (op === '==' || op === '=~')) {
                    if (value instanceof Tp.Value.Entity)
                        query_term = encodeURIComponent(value.display);
                    else
                        query_term = encodeURIComponent(value);
                }
                else if (pname === 'actors' && (op === 'contains' || op === 'contains~')) {
                    if (hints.filter.length > 1) {
                        if (value instanceof Tp.Value.Entity) {
                            query_term += value.value;
                            query_term += encodeURIComponent(",");
                        }
                        else {
                            query_term += value;
                            query_term += encodeURIComponent(",");
                        }
                    }
                    else{
                        if (value instanceof Tp.Value.Entity)
                            query_term = encodeURIComponent(value.value);
                        else
                            query_term = encodeURIComponent(value);
                    }
                    searchType = 'actor';
                }
            }
        }
        if (!query_term) {
            console.log("No query term identified; Here's info about The Avengers:");
            query_term = 'Avengers';
        }
        if (searchType === 'actor'){
            const movieQuery = tmdbAccess + discoverSearch + this.constructor.metadata.auth.api_key + '&language=en-US&sort_by=popularity.desc&include_adult=false&include_video=false&page=1&with_cast=' + query_term + '&with_watch_monetization_types=flatrate';
            const response1 = await Tp.Helpers.Http.get(movieQuery);
            let parsedResponse = JSON.parse(response1);
            return Promise.all(parsedResponse.results.map(async (result) => {
                const castQuery = `https://api.themoviedb.org/3/movie/${result.id}/credits?api_key=${this.constructor.metadata.auth.api_key}&language=en-US`;
                let id = new Tp.Value.Entity(String(result.id), String(result.title));
                let oneDate = new Date(Date.now());
                if ((result.release_date !== undefined) && (String(result.release_date) !== ''))
                    oneDate = new Date(result.release_date);
                const movieObj = {
                    id,
                    description: result.overview,
                    release_date: oneDate,
                    rating_score: Number(result.vote_average),
                    actors:[]
                };
                try{
                    const actorResponse = await Tp.Helpers.Http.get(castQuery);
                    const actorsParsed = JSON.parse(actorResponse);
                    for (const person1 of (actorsParsed.cast))
                        movieObj.actors.push(new Tp.Value.Entity(String(person1.id), person1.name));
                }
                catch(err){
                    console.log("Information for one actor could not be found...");
                }
                return movieObj;
            }));
        }
        else {
            const movieQuery = tmdbAccess + multiSearch + this.constructor.metadata.auth.api_key + '&language=en-US&query=' + query_term + '&page=1%include_adult=false';
            const response1 = await Tp.Helpers.Http.get(movieQuery);
            let parsedResponse = JSON.parse(response1);
            return Promise.all(parsedResponse.results.map(async (result) => {
                const castQuery = `https://api.themoviedb.org/3/movie/${result.id}/credits?api_key=${this.constructor.metadata.auth.api_key}&language=en-US`;
                let oneDate = new Date(Date.now());
                if ((result.release_date !== undefined) && (String(result.release_date) !== ''))
                    oneDate = new Date(result.release_date);
                const movieObj = {
                    id: new Tp.Value.Entity(String(result.id), String(result.title)),
                    description: result.overview,
                    release_date: oneDate,
                    rating_score: Number(result.vote_average),
                    actors:[]
                };
                try{
                    const actorResponse = await Tp.Helpers.Http.get(castQuery);
                    const actorsParsed = JSON.parse(actorResponse);
                    for (const person1 of (actorsParsed.cast))
                        movieObj.actors.push(new Tp.Value.Entity(String(person1.id), person1.name));
                }
                catch(err){
                    console.log("Information for one actor could not be found...");
                }
                return movieObj;
            }));
        }
    }
    get_actor(params, hints, env){
        let actorSortUrl = '';
        let actorQueryURL = "https://api.themoviedb.org/3/search/person?api_key=" + this.constructor.metadata.auth.api_key + "&language=en-US&query=";
        if (hints && hints.sort){
            if (hints.sort[0] === 'popularity' && hints.sort[1] === 'desc')
                actorSortUrl = "https://api.themoviedb.org/3/person/popular?api_key=" + this.constructor.metadata.auth.api_key + "&language=en-US&page=1";
        }
        if (actorSortUrl){
            return Tp.Helpers.Http.get(actorSortUrl).then((response) => {
                let parsedResponse = JSON.parse(response);
                return parsedResponse.results.map((result) => {
                    let id = new Tp.Value.Entity(String(result.id), result.name);
                    return ({
                        id,
                        popularity:result.popularity,
                    });
                });
            });
        }
        let actorQuery = '';
        if (hints && hints.filter){
            for (let [pname, op, value] of hints.filter) {
                if (pname === 'id' && (op === '==' || op === '=~')) {
                    if (value instanceof Tp.Value.Entity)
                        actorQuery = encodeURIComponent(value.display);
                    else 
                        actorQuery = encodeURIComponent(value);
                }
            }
        }
        if (!actorQuery)
            actorQuery = 'Tom%Cruise';
        actorQueryURL = actorQueryURL + actorQuery + "&page=1&include_adult=false";
        console.log(actorQueryURL);
        return Tp.Helpers.Http.get(actorQueryURL).then((response) => {
            let parsedResponse = JSON.parse(response);
            console.log(parsedResponse);
                return parsedResponse.results.map((result) => {
                    let id = new Tp.Value.Entity(String(result.id), result.name);
                    return ({
                        id,
                        popularity:result.popularity,
                    });
                });
        });
    }
};



