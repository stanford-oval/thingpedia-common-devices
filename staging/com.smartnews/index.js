"use strict";

const Tp = require("thingpedia");
const API_URL = "http://dev-snva.smartnews.com/api/v1";
const DEVICE_TOKEN = 1;  // use 1 for now
// const API_URL = "https://039ev0y88l.execute-api.us-west-1.amazonaws.com/test/v2"; //DEMO API


module.exports = class SmartNewsDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = "com.smartnews";
        this.name = "SmartNews";
        this.description = "SmartNews latest articles";
    }

    get_article({ device_token = DEVICE_TOKEN, count }) {
        let url = API_URL + "/top?deviceToken=" + device_token;
        count = count || 5; //default is 5 news
        return Tp.Helpers.Http.get(url).then((response) => {
            return JSON.parse(response);
        }).then((parsed) => {
            let newArray = parsed['blocks'][0]['links'].concat(parsed['blocks'][1]['links']);
            newArray = newArray.filter((element) => element['articleViewStyle'] === 'SMART');
            newArray = newArray.filter((element) => element['title'] !== 'coronavirus_push_landingpage');
            newArray = newArray.slice(0, count);
            return newArray.map((article) => {
                return {
                    //id: article["id"], // this id is for internal use
                    title: article["title"],
                    date: new Date(article["publishedTimestamp"] * 1000),
                    source: article["site"]["name"],
                    url: article["url"]
                };
            });
        });
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
