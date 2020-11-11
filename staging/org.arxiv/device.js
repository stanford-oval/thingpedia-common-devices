// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2018 Silei Xu <silei@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');
const baseUrl = 'http://export.arxiv.org/api/query';

module.exports = class ArXivDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'com.arxiv';

        this.name = "ArXiv";
        this.description = "ArXiv interface";
    }

    async get_query({ query, category, author }) {
        let params = [];
        let suffix = `&sortBy=submittedDate`;
        if (query)
            params.push(`all:${encodeURIComponent(query)}`);
        if (category)
            params.push(`cat:${encodeURIComponent(category)}`);
        if (author) {
            params.push(`au:${encodeURIComponent(author)}`);
            // the result of searching by author is really bad, do not sort result by submitted date, using the default (by relevance)
            suffix = '';
        }
        
        if (params.length === 0)
            throw new Error('Please at least provide one parameter: author, category, or keyword');

        let url = baseUrl + `?search_query=${params.join(encodeURIComponent(' AND '))}&max_results=5${suffix}`;

        const parsed = await Tp.Helpers.Http.get(url).then(Tp.Helpers.Xml.parseString);
        if (!parsed.feed.entry)
            return [];
        return parsed.feed.entry.map((paper) => {
            return {
                title: paper.title[0],
                author: paper.author.map((au) => au.name).join(', '), // swtich back to a list once we fix the filter
                pubDate: new Date(paper.published[0]),
                link: paper.link[0].$.href,
                summary: paper.summary[0],
            };
        });
    }
};
