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
const byline = require('byline');
const Url = require('url');
const zlib = require('zlib');

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

async function* tryGetArticle(forDate) {
    const url = `https://en-us-oval-project.s3-us-west-1.amazonaws.com/data/${forDate}/summary_${forDate}.jsonl.gz`;

    let anyNews = false;
    try {
        const stream = (await Tp.Helpers.Http.getStream(url)).pipe(zlib.createGunzip()).setEncoding('utf8').pipe(byline());

        let i = -1;
        for await (const line of stream) {
            i++;
            try {
                const article = JSON.parse(line);
                if (article['articleViewStyle'] !== 'SMART')
                    continue;
                if (article['title'] === 'coronavirus_push_landingpage')
                    continue;
                anyNews = true;
                yield {
                    id: new Tp.Value.Entity(String(article.link_id), null),
                    link: article.url,
                    title: article.title,
                    date: new Date(article.publishedTimestamp * 1000),
                    source: article.site ? article.site.name : null,
                    author: article.author ? article.author.name : null,
                    audio_url: s3tohttp(article.summary_mp3_file),
                    content: article.body,
                };
            } catch(e) {
                if (e.name !== 'SyntaxError')
                    throw e;

                console.error(`WARNING: syntax error in SmartNews summary file at line ${i}: ${e.message}`);
            }
        }
    } catch(e) {
        if (e.code === 404 || e.code === 403)
            throw new UnavailableError(`summary missing for ${forDate}`);
        throw e;
    }
    if (!anyNews)
        throw new UnavailableError(`summary empty for ${forDate}`);
}

module.exports = class SmartNewsDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = "com.smartnews";
        this.name = "SmartNews";
        this.description = "SmartNews latest articles";
    }

    async *get_article(params, hints) {
        const now = new Date;
        const yesterday = new Date(now.getTime() - 86400 * 1000);

        try {
            const date = `${now.getYear()-100}${now.getMonth() < 9 ? '0' : ''}${now.getMonth()+1}${now.getDate()<10 ? '0': ''}${now.getDate()}`;
            yield* tryGetArticle(date);
        } catch(e1) {
            if (!(e1 instanceof UnavailableError))
                throw e1;

            try {
                const date = `${yesterday.getYear()-100}${yesterday.getMonth() < 9 ? '0' : ''}${yesterday.getMonth()+1}${yesterday.getDate()<10 ? '0': ''}${yesterday.getDate()}`;
                yield* tryGetArticle(date);
            } catch(e2) {
                if (!(e2 instanceof UnavailableError))
                    throw e2;
                throw e1;
            }
        }
    }

    // get_reading_list({ device_token = DEVICE_TOKEN }) {
    //     let url = API_URL + "/list?deviceToken=" + device_token;
    //     return Tp.Helpers.Http.get(url).then((response) => {
    //         let jsonData = JSON.parse(response);
    //         let articleIdList = jsonData.articleIdList;
    //         let newsPromises = articleIdList.map((articleId) => {
    //             let url = API_URL + "/news?articleId=" + articleId;
    //             return Tp.Helpers.Http.get(url);
    //         });
    //         return Promise.all(newsPromises);
    //     }).then((responses) => {
    //         let newArray = responses.filter((element) => element['articleViewStyle'] === 'SMART');
    //         newArray = newArray.filter((element) => element['title'] !== 'coronavirus_push_landingpage');
    //         return newArray.map((response) => {
    //             /*console.log(response);
    //             let jsonData = JSON.parse(response);
    //             if (jsonData.error) {
    //                 return {
    //                     id: '',
    //                     title: jsonData.error,
    //                     url: '',
    //                     date: '',
    //                     source: ''
    //                 }
    //             }*/
    //             let article = JSON.parse(response);
    //             return {
    //                 id: article["id"],
    //                 title: article["title"],
    //                 url: article["url"],
    //                 date: new Date(article["publishedTimestamp"] * 1000),
    //                 source: article["site"]["name"]
    //             };
    //         });
    //     });
    // }

    // //connect SN API endpoint /pocket with POST request
    // do_pocket({ id, device_token = DEVICE_TOKEN }) {
    //     return Tp.Helpers.Http.post(
    //         API_URL + "/pocket?deviceToken=" + device_token,
    //         JSON.stringify({ articleIds: [id] }),
    //         { dataContentType: 'application/json' }
    //     );
    // }

    // //connect SN API endpoint /drop with POST request
    // do_drop({ id, device_token = DEVICE_TOKEN }) {
    //     return Tp.Helpers.Http.post(
    //         API_URL + "/drop?deviceToken=" + device_token,
    //         JSON.stringify({ articleIds: [id] }),
    //         { dataContentType: 'application/json' }
    //     );
    // }


    // //connect SN API endpoint /top with GET request
    // get_article({ count }) {
    //     count = count || 3; //default is 10 news
    //     let url = API_URL + "/top?count=" + count;
    //     return Tp.Helpers.Http.get(url).then((response) => {
    //         return JSON.parse(response);
    //     }).then((parsed) => {
    //         return parsed.map((article) => {
    //             return {
    //                 id: article["id"],
    //                 title: article["title"],
    //                 date: new Date(article["published_time"] * 1000),
    //                 source: article["site"],
    //                 audio: article["audio"],
    //                 content: article["content"],
    //                 url: article["url"]
    //             };
    //         });
    //     });
    // }

    // //connect SN API endpoint /list with GET request
    // get_reading_list({ user = USER }) {
    //     let url = API_URL + "/list?user=" + user;
    //     return Tp.Helpers.Http.get(url).then((response) => {
    //         return JSON.parse(response);
    //     }).then((parsed) => {
    //         return parsed.map((article) => {
    //             return {
    //                 id: article["id"],
    //                 title: article["title"],
    //                 date: new Date(article["publishedTimestamp"] * 1000),
    //                 source: article["site"],
    //                 audio: article["audio"],
    //                 content: article["content"]
    //             };
    //         });
    //     });
    // }

    // //connect SN API endpoint /pocket with POST request
    // do_pocket({ id, user = USER }) {
    //     return Tp.Helpers.Http.post(
    //         API_URL + "/pocket?user=" + user,
    //         JSON.stringify({ reading_list: [id] }),
    //         { dataContentType: 'application/json' }
    //     );
    // }

    // //connect SN API endpoint /drop with POST request
    // do_drop({ id, user = USER }) {
    //     return Tp.Helpers.Http.post(
    //         API_URL + "/drop?user=" + user,
    //         JSON.stringify({ reading_list: [id] }),
    //         { dataContentType: 'application/json' }
    //     );
    // }
};
