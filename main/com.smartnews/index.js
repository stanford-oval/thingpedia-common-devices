// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2020-2021 SmartNews Inc.
//           2021 The Board of Trustees of the Leland Stanford Junior University
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
"use strict";


const Tp = require("thingpedia");

const BASE_URL = "https://newsapi.org/v2";
const API_KEY = process.env.NEWS_APIKEY;

class UnavailableError extends Error {
    constructor(message) {
        super(message);
        this.code = "unavailable";
    }
}


async function fetch_sources() {
    const url = `${BASE_URL}/sources?country=us&apiKey=${API_KEY}`;
    const sources = JSON.parse(await Tp.Helpers.Http.get(url)).sources;
    return sources.map((item) => { return {
        id: item.id,
        name: item.name,
        category: item.category,
        language: item.language,
        country: item.country
    }});
}

const MAX_ARTICLES = 5;

async function* fetch_articles(source_list) {
    const url = `${BASE_URL}/top-headlines?country=us&apiKey=${API_KEY}`;
    console.log(url);
    const articles = JSON.parse(await Tp.Helpers.Http.get(url)).articles;
    if (!articles || (articles.length === 0))
            throw new UnavailableError("news service not available");

    let counter = MAX_ARTICLES;
    for (const article of articles) {
        let category = null;
        if (article.source.id)
            category = source_list.filter((item) => {
                return item.id.toLowerCase() === article.source.id.toLowerCase()
            });
        yield {
            id: new Tp.Value.Entity(article.title, article.title),
            title: article.title,
            author: article.author ? article.author : null,
            source: article.source ? article.source.name : null,
            summary: article.publishedAt,
            link: article.url,
            category: category,
            date: new Date(article.publishedAt),
        };
        counter--;
        if (counter === 0)
            break;
    }
}


module.exports = class SmartNewsDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = "com.smartnews";
        this.name = "SmartNews";
        this.description = "SmartNews latest articles";
    }

    async *get_article({ keyword="" }, hints) {
        const source_list = await fetch_sources();
        let args = {};
        if (hints && hints.filter) {
            for (let [pname, op, value] of hints.filter) {
                if (pname === "date") {
                    if (op === ">=")
                        args.start_date = Math.floor(value.getTime() / 1000);
                    else if ((op === "<=") || (op === "=="))
                        args.end_date = Math.floor(value.getTime() / 1000);
                }
                if (pname === "category") {
                    if (op === "contains")
                        args.category = String(value);
                }
                if (pname === "source") {
                    if ((op === "==") || (op === "=~"))
                        args.source = String(value);
                }
            }
        }
        if (keyword)
            args.keyword = keyword;
        try {
            yield* fetch_articles(source_list);
        } catch(error) {
            if (!(error instanceof UnavailableError))
                throw new UnavailableError("news service not available");
        }
    }
};
