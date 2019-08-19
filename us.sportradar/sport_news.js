// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Ryan Cheng <ryachen@nuevaschool.org>
//
// See LICENSE for details

"use strict";

const Tp = require("thingpedia");
const NEWS_API_URL = "https://newsapi.org/v2/everything?q=%s&apiKey=%s";
const HEADLINES_API_URL = "https://newsapi.org/v2/top-headlines?country=us&category=sports&apiKey=%s";

module.exports = class NewsHeadlines {
    constructor(key) {
        this.name = "Sports News Api";
        this.description =
            "News Api which is used to retrieve sports headlines";
        this._api_key = key;
    }

    get_get_sports_headlines(league) {
        const url = NEWS_API_URL.format(league.sport_league.display, this._api_key);
        return Tp.Helpers.Http.get(url).then((response) => {
            const parsed = JSON.parse(response);
            const articles = parsed.articles;
            return articles.map((a) => {
                return {
                    link: a.url,
                    title: a.title,
                    description: a.description,
                };
            });
        });
    }

    get_get_top_headlines() {
        const url = HEADLINES_API_URL.format(this._api_key);
        return Tp.Helpers.Http.get(url).then((response) => {
            const parsed = JSON.parse(response);
            const articles = parsed.articles;
            return articles.map((a) => {
                return {
                    link: a.url,
                    title: a.title,
                    description: a.description,
                };
            });
        });
    }
};
