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


function s3tohttp(url) {
    const parsed = Url.parse(url);
    if (parsed.protocol !== 's3:')
        return url;

    parsed.protocol = 'https:';
    if (parsed.host === 'oval-project')
        parsed.host = parsed.hostname = 'oval-project.s3-ap-northeast-1.amazonaws.com';
    else if (parsed.host === 'en-us-oval-project')
        parsed.host = parsed.hostname = 'en-us-oval-project.s3-us-west-1.amazonaws.com';
    else
        parsed.host = parsed.hostname = parsed.host + '.s3.amazonaws.com';
    return Url.format(parsed);
}


class UnavailableError extends Error {
    constructor(message) {
        super(message);
        this.code = 'unavailable';
    }
}


async function* fetch_articles(date, category, limit=0, offset=0) {
    try {
        let query_string = {
            date: date
        };
        if (category)
        query_string = Object.assign({category: category}, query_string);
        if (limit)
            query_string = Object.assign({limit: limit}, query_string);
        if (offset)
            query_string = Object.assign({offset: offset}, query_string);
        const url = `${NEWS_DB_URL}?${querystring.stringify(query_string)}`;
        const news_blob = JSON.parse(await Tp.Helpers.Http.get(url)).items;
        if (!news_blob)
            throw Error("no news yet");
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
                headline_audio_url: s3tohttp(article.headline_audio_s3),
                summary_audio_url: s3tohttp(article.summary_audio_s3)
            };
        }
    } catch(e) {
        if (e.code === 404 || e.code === 403)
            throw new UnavailableError(`summary missing for ${forDate}`);
        throw e;
    }
}


function format_date(date) {
    return `${date.getFullYear()}${date.getMonth() < 9 ? '0' : ''}${date.getMonth()+1}${date.getDate()<10 ? '0': ''}${date.getDate()}`;
}


module.exports = class SmartNewsDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = "com.smartnews";
        this.name = "SmartNews";
        this.description = "SmartNews latest articles";
    }

    async *get_article(params, hints) {
        var date = "";
        var category = "";
        if (hints && hints.filter) {
            for (let [pname, op, value] of hints.filter) {
                if (pname === "date") {
                    if (op === ">=") {
                        date = format_date(value);
                    } else if (op === "<=") {
                        value.setDate(value.getDate() - 1);
                        value.setHours(23, 59, 59);
                        date = format_date(value);
                    }
                }
                if (pname === "category")
                    if (op === "contains")
                        category = (String(value))
            }
        }
        if (!date) {
            const now = new Date;
            date = format_date(now);
            try {
                if (category)
                    yield* fetch_articles(date, category);
                else
                    yield* fetch_articles(date);
            } catch(e1) {
                if (!(e1 instanceof UnavailableError))
                    throw e1;
                try {
                    const yesterday = new Date(now.getTime() - 86400 * 1000);
                    const date = format_date(yesterday);
                    if (category)
                        yield* fetch_articles(date, category);
                    else
                        yield* fetch_articles(date);
                } catch(e2) {
                    if (!(e2 instanceof UnavailableError))
                        throw e2;
                    throw e1;
                }
            }
        } else {
            try {
                yield* fetch_articles(date);
            } catch(err) {
                if (!(err instanceof UnavailableError))
                    throw err;
            }
        }
    }
};
