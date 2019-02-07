// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Silei Xu <silei@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const Tp = require('thingpedia');

const cheerio = require('cheerio');

module.exports = class WikiCFP extends Tp.BaseDevice {
    get_search({ query }) {
        const url = `http://www.wikicfp.com/cfp/servlet/tool.search?q=${query}&year=t`;

        return Tp.Helpers.Http.get(url).then((response) => {
            const $ = cheerio.load(response);
            let events = [];
            let event = {};
            $('.contsec > table > tbody table tr').each((i, tr) => {
                if (i === 0)
                    return;
                if (i % 2 === 0) {
                    $('td', tr).each((j, td) => {
                        if (j === 0) {
                            let [start, end] = $(td).text().split(' - ');
                            event.start = new Date(start);
                            event.end = new Date(end);
                        }
                        if (j === 1) event.city = $(td).text();
                        if (j === 2) {
                            // the deadline might includes the abstract deadline in parentheses, remove it if exists
                            let deadline = $(td).text().replace(/\([^)]*\)/, '');
                            event.deadline = new Date(deadline);
                        }
                    });
                    events.push(event);
                    event = {};
                } else {
                    $('td', tr).each((j, td) => {
                        if (j === 0) {
                            event.abbr = $(td).text();
                            event.link = 'http://www.wikicfp.com' + $(td).children().attr('href');
                        }
                        if (j === 1) event.name = $(td).text();
                    });
                }
                
            });
            return events;
        }).catch(function (e) {
            throw new Error('Failed to retrieve information from WikiCFP: ' + e);
        });

    }
};