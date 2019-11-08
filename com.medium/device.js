'use strict';

const Tp = require("thingpedia");
const PROFILE_URL = "https://medium.com/feed/@%s";

module.exports = class MediumDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'com.medium';
        this.name = "Medium";
        this.description = "Medium RSS feeds: subscribe to your favorite writers";
    }

    get_articles(author) {
        const url = PROFILE_URL.format(author.author);
        return Tp.Helpers.Http.get(url).then((response) => {
            return Tp.Helpers.Http.get(url).then((result) => Tp.Helpers.Xml.parseString(
                result)).then((parsed) => {
                const articles = parsed.rss.channel[0].item;
                return articles.map((article) => {
                    return ({
                        title: article.title,
                        link: article.link[0],
                        updated: article['atom:updated']
                    });
                });

            });

        }).catch((e) => {
            throw new Error("Invalid Username");
        });

    }

};