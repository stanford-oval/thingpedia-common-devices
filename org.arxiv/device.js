// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2018 Silei Xu <silei@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');
const xml2js = require('xml2js');
const Q = require('q');
const baseUrl = 'http://export.arxiv.org/api/query';

const categories = require('./cat.json');

module.exports = class ArXivDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'com.arxiv';

        this.name = "ArXiv";
        this.description = "ArXiv interface";
    }

    get_query({ query, category, author }) {
        let params = [];
        let suffix = `&sortBy=submittedDate`;
        if (query)
            params.push(`all:${encodeURIComponent(query)}`);
        if (category) {
            category = category.toLowerCase();
            if (category === 'ai')
                category = 'cs.AI';
            else if (category === 'ml')
                category = 'cs.ML';
            else if (category === 'cv' || category === 'computer vision' || category === 'pattern recognition')
                category = 'cs.CV';
            else if (category === 'HCI' || category === 'human computer interaction')
                category = 'cs.HC';
            else if (category in categories)
                category = categories[category];
            else
                category = null;
            if (category)
                params.push(`cat:${encodeURIComponent(category)}`);
            else
                params.push(`all:${encodeURIComponent(category)}`);
        }
        if (author) {
            params.push(`au:${encodeURIComponent(author)}`);
            // the result of searching by author is really bad, do not sort result by submitted date, using the default (by relevance)
            suffix = '';
        }
        
        if (params.length === 0)
            throw new Error('Please at least provide one parameter: author, category, or keyword');

        let url = baseUrl + `?search_query=${params.join(encodeURIComponent(' AND '))}&max_results=5${suffix}`;
        return Tp.Helpers.Http.get(url).then((response) => {
            let parser = xml2js.parseString;
            return Q.nfcall(parser, response).then((res) => {
                return res.feed.entry.map((paper) => {
                    return {
                        title: paper.title,
                        author: paper.author.map((au) => au.name).join(', '), // swtich back to a list once we fix the filter
                        pubDate: new Date(paper.published),
                        link: paper.link[0].$.href,
                        summary: paper.summary,
                    };
                });
            });
        });
    }
};
