"use strict";

const Tp = require("thingpedia");
const NEWS_API_KEY = "97a0cd1b088c48d197b2b2301e00ad92";
const NEWS_API_URL =
    "https://newsapi.org/v2/everything?q=%s&apiKey=" + NEWS_API_KEY;

module.exports = class NewsHeadlines {
    constructor() {
        this.uniqueId = "org.newsapi";
        this.name = "News Api";
        this.description =
            "News Api which is used to retrieve sports headlines";
    }

    get_get_sports_headlines(league) {
        console.log(league.sport_league);
        const url = NEWS_API_URL.format(league.sport_league);
        console.log(url);
        return Tp.Helpers.Http.get(url).then((response) => {
            let parsed = JSON.parse(response);
            const articles = parsed.articles;
            let random_number = Math.floor(Math.random() * 20);
            return [
                {
                    link: articles[random_number].url,
                    title: articles[random_number].title,
                    description: articles[random_number].description,
                },
            ];
        });
    }
};
