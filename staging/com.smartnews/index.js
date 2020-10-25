"use strict";

const Tp = require("thingpedia");
const API_URL = "https://039ev0y88l.execute-api.us-west-1.amazonaws.com/test/v2";
const USER = "jack";  // use 1 for now
//const cheerio = require("cheerio");

module.exports = class SmartNewsDevice extends Tp.BaseDevice {
    constructor(engine, state) {
         super(engine, state);

         this.uniqueId = "com.smartnews";
         this.name = "SmartNews";
         this.description = "SmartNews latest articles";
    }

    //connect SN API endpoint /top with GET request
    get_top_articles({counter}) {
        counter = counter || 10; //default is 10 news
        let url = API_URL + "/top?counter=" + counter;
        return Tp.Helpers.Http.get(url).then((response) => {
            return JSON.parse(response);
        }).then((parsed) => {
            return parsed.map((article) => {
                return {
                    news_id: article["id"],
                    title: article["title"],
                    date: new Date(article["published_time"] * 1000),
                    site_name: article["site"],
                    audio: article["audio"],
                    content: article["content"],
                    url: article["url"]
                };
            });
        });
    }
    //connect SN API endpoint /list with GET request
    get_reading_list({user=USER}) {
        let url = API_URL + "/list?user=" + user;
        return Tp.Helpers.Http.get(url).then((response) => {
            return JSON.parse(response);
        }).then((parsed) => {
            return parsed.map((article) => {
                return {
                    news_id: article["id"],
                    title: article["title"],
                    date: new Date(article["publishedTimestamp"] * 1000),
                    site_name: article["site"],
                    audio: article["audio"],
                    content: article["content"]
                };
            });
        });
    }

    //connect SN API endpoint /pocket with POST request
    do_pocket({news_id, user=USER}) {
        return Tp.Helpers.Http.post(
            API_URL + "/pocket?user=" + user,
            JSON.stringify({ reading_list: [news_id] }),
            { dataContentType: 'application/json' }
        );
    }

    //connect SN API endpoint /drop with POST request
    do_drop({news_id, user=USER}) {
        return Tp.Helpers.Http.post(
            API_URL + "/drop?user=" + user,
            JSON.stringify({ reading_list: [news_id] }),
            { dataContentType: 'application/json' }
        );
    }
};
