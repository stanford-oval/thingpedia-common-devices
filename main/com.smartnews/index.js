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
const Url = require('url');
const querystring = require("querystring");


const NEWS_DB_URL = "http://54.238.163.11:5000/news";
// const NEWS_DB_URL = "http://192.168.50.183:5000/news";


function s3_to_http(url) {
    const parsed = Url.parse(url);
    if (parsed.protocol !== "s3:")
        return url;
    parsed.protocol = "https:";
    if (parsed.host === "oval-project")
        parsed.host = parsed.hostname = "oval-project.s3-ap-northeast-1.amazonaws.com";
    else if (parsed.host === "en-us-oval-project")
        parsed.host = parsed.hostname = "en-us-oval-project.s3-us-west-1.amazonaws.com";
    else
        parsed.host = parsed.hostname = parsed.host + ".s3.amazonaws.com";
    return Url.format(parsed);
}


class UnavailableError extends Error {
    constructor(message) {
        super(message);
        this.code = "unavailable";
    }
}


async function* fetch_articles(args) {
    const url = `${NEWS_DB_URL}?${querystring.stringify(args)}`;
    const news_blob = JSON.parse(await Tp.Helpers.Http.get(url)).items;
    if (!news_blob || (news_blob.length === 0)) {
        if (args.start_date && args.end_date) {
            const start_date = new Date(args.start_date * 1000).toISOString();
            const end_date = new Date(args.end_date * 1000).toISOString();
            throw new UnavailableError(`news not available yet for ${start_date} and ${end_date}`);
        } else if (args.start_date) {
            const date = new Date(args.start_date * 1000).toISOString();
            throw new UnavailableError(`news not available yet for ${date}`);
        } else if (args.end_date) {
            const date = new Date(args.end_date * 1000).toISOString();
            throw new UnavailableError(`news not available yet for ${date}`);
        } else {
            throw new UnavailableError("news service not available");
        }
    }     
    for (const article of news_blob) {
        const category = article.category.map((cat) => new Tp.Value.Entity(`${cat.toLowerCase()}`, cat.toLowerCase()));
        yield {
            id: new Tp.Value.Entity(String(article.link_id), null),
            title: article.headline,
            author: article.author ? article.author : null,
            source: article.source ? article.source : null,
            summary: article.summary,
            link: article.link,
            category,
            date: new Date(article.publish_timestamp * 1000),
            mention: article.entity_mentions,
            headline_audio_url: s3_to_http(article.headline_audio_s3),
            summary_audio_url: s3_to_http(article.summary_audio_s3)
        };
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
        var args = {};
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
            yield* fetch_articles(args);
        } catch(error) {
            if (!(error instanceof UnavailableError))
                throw new UnavailableError("news service not available");
        }
    }
};
