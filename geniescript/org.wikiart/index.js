// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of org.wikiart
//
// Copyright 2022 Damon Zuber <undefined>
//
// See LICENSE for details
"use strict";
const Tp = require('thingpedia');
const URL = `https://www.wikiart.org/en/Api/2/login?accessCode=`;
const ACCESS_KEY = '2b68c956ed8e4a76';
const PRIVATE_KEY = 'bca957804bf484aa';

// NOTE - with painting id, I can get description of paintings via search - should I?
// async get_detailed_painting(painting_id){  // painting_id = cleaned_data.contnentID slightly repetitive given we already have some of this data about a painting
//     url = `http://www.wikiart.org/en/App/Painting/ImageJson/` + painting_id
//     const response = await Tp.Helpers.Http.get(url);
//     const parsed = await Tp.Helpers.Xml.parseString(response);
//     const data = {
//         id: Tp.Value.Entity(parsed.title, parsed.contentID),
//         artist: parsed.artistName,
//         year: parsed.completitionYear,
//         artist_id: parsed.artistContentId,  // obscure piece of data it seems, may remove
//         image: parsed.image,
//         description: parsed.description,
//         artist_url = parsed.artistURL // enables us to search for more of this artist's works
//     }

// }

// function bestResult(cleaned_data, ADD) {}
// takes cleaned data, checks our keywords against what we have and determines best match, returns that data

// returns format of artist name that can be used in artist database search
function format_artist(name){
    // (name)
    // console.log(name)
    const str_name = name.toString();
    const trimmed = str_name.trim(); // remove trailing and leading whitespace
    const lower = trimmed.toLowerCase();
    const formatted = lower.replace(/\ /g, "-");
    // console.log(typeof formatted)
    // console.log(formatted)
    return formatted;
}
module.exports = class WikiArt extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);
        this.name = "WikiArt";
        this.description = "WikiArt";
    }

    async extract_painting_data(url) {  // takes in url and gets back the data we actually need
        const response = await Tp.Helpers.Http.get(url);
        // const parsed = await Tp.Helpers.Xml.parseString(response);
        const parsed = JSON.parse(response);
        const data = [];  // Map instead of set?
        for (var i = 0; i < parsed.length; i++) {
            const temp = {
                id: new Tp.Value.Entity(`${parsed[i]["title"]}`, parsed[i]["title"]),
                artist: new Tp.Value.Entity(`${parsed["artistName"]}`, parsed["artistName"]),
                year: parsed[i]["completitionYear"],
                image_url: parsed[i]["image"],
                content_id: parsed[i]["contentId"]
            };
            data.push(temp);
        }
        return data;
    }
    // async get_session_key(){
    //     //${KEY} is behaving as if hardcoded right now, will this change when actually in use? used concat for time being.
    //     const url = URL + `/Api/2/login?accessCode=` + ACCESS_KEY + `&secretCode=` + PRIVATE_KEY;
    //     const response = Tp.Helpers.Http.get(url);
    //     const parsed = await Tp.Helpers.Xml.parseString(response);
    //     session_key = parsed[0].SessionKey;
    //     return session_key;
    // }

    async get_painting(params, hints, env) {
        // authenticate API (look at Yelp and Twitter / online); how do i authenticate and structure API in javascript
        // test URL by itself to make sure it works

        // look at Yelp equiv file
        let cleaned_data;
        if (hints && hints.filter) {  // any way to combine search terms because artist + painting and maybe year likely necessary to get best option
            // if just artist, can use http://www.wikiart.org/en/App/Painting/PaintingsByArtist?artistUrl=${artist_first-last}
            let keywords = [];
            for (let [pname, op, value] of hints.filter) {
                if (pname === 'id' && (op === '==' || op === '=~')) {  // painting name
                    keywords.push(value);
                }
                if (pname === 'artist' && (op === '==' || op === '=~')) {  // artist name; unsure how to do because we need to get artist URL first 
                    keywords.push(value);
                    // url = `http://www.wikiart.org/en/App/Painting/PaintingsByArtist?artistUrl=${value}&json=2`;
                }
                if (pname === 'year' && (op === '==' || op === '=~')) {  // artist name; unsure how to do because we need to get artist URL first 
                    keywords.push(value);
                    // url = `http://www.wikiart.org/en/App/Painting/PaintingsByArtist?artistUrl=${value}&json=2`;
                }
            }
            // TODO: whether empty string works
            let keyword = keywords.join(' ');
            const url = `http://www.wikiart.org/en/search/`+ keyword + `/1?json=2&PageSize={pageSize}`;
            cleaned_data = await this.extract_painting_data(url);
            // const best_match = best_result
        }
        else {  // if no keywords (i.e. show me a painting) choose random from most viewed
            const data = [];
            const url = `https://www.wikiart.org/en/App/Painting/MostViewedPaintings?`;
            const cleaned_data = await this.extract_painting_data(url);
            const rand_index = Math.floor(Math.random() * cleaned_data.length);
            data.push(cleaned_data[rand_index]);
            return data; 

        }
        return cleaned_data;
    }

    async extract_artist_data(url){
        const response = await Tp.Helpers.Http.get(url);
        const parsed = JSON.parse(response);
        const years_active = parsed["activeYearsStart"] + `-` + parsed["activeYearsCompletion"]
        const data = {
            // TODO:
            id: new Tp.Value.Entity(`${parsed["artistName"]}`, parsed["artistName"]),
            gender: parsed["gender"],
            birthday: parsed["birthDayAsString"],
            death_date: parsed["deathDayAsString"],
            years_active: years_active,
            biography: parsed["biography"],
            image_url: parsed["image"]
            }
        return data;
    }

    async get_artist(params, hints, env) {

        // need artist name in form of first-last

        if (hints && hints.filter) {  // any way to combine search terms because artist + painting and maybe year likely necessary to get best option
            for (let [pname, op, value] of hints.filter) {
                if (pname === 'id' && (op === '==' || op === '=~')) {  // painting name
                    const name = format_artist(value);
                    // console.log(name);
                    const url = `https://www.wikiart.org/en/`+ name + `?json=2`;
                    let data = []
                    data.push(await this.extract_artist_data(url));
                    // console.log(data)
                    // TODO
                    return data;  // how do I limit to a certain number of results?
                }
                // const best_match = best_result
            }
        }
        else {  // if no keywords (i.e. show me a painting) choose random from most viewed
            const popular_url = `https://www.wikiart.org/en/app/api/popularartists?json=1`;
            const response = await Tp.Helpers.Http.get(popular_url);
            const parsed = JSON.parse(response);
            let artist_url = [];  // Map instead of set?
            for (var i = 0; i < parsed.length; i++){
                const curr_url = parsed[i]["url"];
                artist_url.push(curr_url)
            }

            const data = [];  // Map instead of set?
            const rand_index = Math.floor(Math.random() * artist_url.length);
            const rand_artist = artist_url[rand_index];
            const curr_url = `https://www.wikiart.org/en/`+ rand_artist + `?json=2`;
            const artist_data = await this.extract_artist_data(curr_url);
            data.push(artist_data);
            // for (var i = 0; i < parsed.length; i++){
            //     const artist_name = artist_url[i];
            //     console.log(artist_name);
            //     const curr_url = `https://www.wikiart.org/en/`+ artist_name + `?json=2`;
            //     console.log(curr_url);
            //     const artist_data = await this.extract_artist_data(curr_url);
            //     data.push(artist_data);
            // } 
            return data;
        }

        // 'try' statement?

        // return {
        //     // do i need to include content id for search sake 
        //     id: painting.id,
        //     artist: painting.artist,
        //     year: painting.year,
        //     image_url: painting.url
        // }
        // return json file
        // [{id: , artist: , image_url: , year: }]
    }
};