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

const API_URL = "http://dev-snva.smartnews.com/api/v1";
const DEVICE_TOKEN = 1;  // use 1 for now
// const API_URL = "https://039ev0y88l.execute-api.us-west-1.amazonaws.com/test/v2"; //DEMO API

const NEW_API = true;

module.exports = class SmartNewsDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = "com.smartnews";
        this.name = "SmartNews";
        this.description = "SmartNews latest articles";
    }

    async *get_article(params, hints) {
        if (NEW_API) {
            const now = new Date;
            const date = `${now.getYear()-100}${now.getMonth() < 9 ? '0' : ''}${now.getMonth()+1}${now.getDate()<10 ? '0': ''}${now.getDate()}`;
            const url = `https://oval-project.s3-ap-northeast-1.amazonaws.com/data/${date}/summary_${date}.jsonl`;

            const stream = (await Tp.Helpers.Http.getStream(url)).setEncoding('utf8').pipe(byline());
            for await (const line of stream) {
                const article = JSON.parse(line);
                if (article['articleViewStyle'] !== 'SMART')
                    continue;
                if (article['title'] === 'coronavirus_push_landingpage')
                    continue;
                yield {
                    id: new Tp.Value.Entity(String(article.link_id), null),
                    link: article.url,
                    title: article.title,
                    date: new Date(article.publishedTimestamp * 1000),
                    source: article.site ? article.site.name : null,
                    author: article.author ? article.author.name : null,
                    audio_url: article.summary_mp3_file,
                    content: article.body,
                };
            }
        } else {
            const device_token = DEVICE_TOKEN;
            let url = API_URL + "/top?deviceToken=" + device_token;

            const response = await Tp.Helpers.Http.get(url);
            const parsed = JSON.parse(response);

            for (const article of parsed['blocks'][0]['links'].concat(parsed['blocks'][1]['links'])) {
                if (article['articleViewStyle'] !== 'SMART')
                    continue;
                if (article['title'] === 'coronavirus_push_landingpage')
                    continue;
                yield {
                    id: new Tp.Value.Entity(String(article.id), null),
                    link: article.url,
                    title: article.title,
                    date: new Date(article.publishedTimestamp * 1000),
                    source: article.site ? article.site.name : null,
                    author: article.author ? article.author.name : null,
                    content: ''
                };
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
