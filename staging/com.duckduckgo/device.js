"use strict";

const Tp = require('thingpedia');

module.exports = class DuckDuckGoClass extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'com.duckduckgo';
        this.name = "DuckDuckGo Search";
        this.description = "Search the web using DuckDuckGo";
    }

    get_web_search({ query }) {
        const url = `https://api.duckduckgo.com/?format=json&q=${query}`;
        return Tp.Helpers.Http.get(url).then((response) => {
            let parsed = JSON.parse(response);

            const resultType = parsed.Type;

            switch (resultType) {

                case "A":
                    //article
                    return [{ description: parsed.Abstract, link: parsed.AbstractURL }];

                case "C":
                    //category
                    return parsed.RelatedTopics.filter((result) => !!result.Text).map((result) => {
                        return {
                            description: result.Text,
                            link: result.FirstURL
                        };
                    });

                case "D":
                    //disambiguation
                    return parsed.RelatedTopics.filter((result) => !!result.Text).map((result) => {
                        return {
                            description: result.Text,
                            link: result.FirstURL
                        };
                    });

                default:
                    throw new Error("Couldn't find any results");
            }
        });
    }
};