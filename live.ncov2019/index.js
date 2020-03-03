// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2020 Silei Xu <silei@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');
const url = 'https://ncov2019.live/';
const cheerio = require('cheerio');
const { overwrite, getCode } = require('country-list');

overwrite([
    { code: 'us', name: 'United States' },
    { code: 'tw', name: 'Taiwan' },
    { code: 'gb', name: 'United Kingdom'},
    { code: 'kr', name: 'South Korea' },
    { code: 'ir', name: 'Iran' },
    { code: 'ir', name: 'Vietnam' },
    { code: 'mo', name: 'Macau' },
    { code: 'ru', name: 'Russia' },
    { code: 'ae', name: 'UAE'}
]);

module.exports = class NCov2019 extends Tp.BaseDevice {
    get_stats() {
        return Tp.Helpers.Http.get(url).then((res) => {
            const result = [];
            const $ = cheerio.load(res);

            // load data outside china
            const international = $('p:contains("International")').next();
            let deathOutsideChina = 0;
            international.find('td').each((i, td) => {
                let children = $(td).contents();
                let previous = '';
                let data = {};
                children.each((i, child) => {
                    let current = $(child).text().trim();
                    let country_code = getCode(current.replace(/\W/g, ''));
                    if (country_code) {
                        data.country = new Tp.Value.Entity(country_code.toLowerCase(), current.replace(/\W/g, ''));
                    } else if (previous.includes('Confirmed')) {
                        data.confirmed = parseInt(current.replace(/,/g, ''));
                    } else if (previous.includes('Dead')) {
                        data.death = parseInt(current.replace(/,/g, ''));
                        deathOutsideChina += data.death;
                    }
                    previous = current;
                });
                if (data.country) {
                    if (!('confirmed' in data))
                        data.confirmed = 0;
                    if (!('death' in data))
                        data.death = 0;
                    result.push(data);
                }
            });

            const totalDeath = parseInt($('.fa-skull-crossbones').parent().contents()[2].data.replace(/,/g, ''));
            const death = totalDeath - deathOutsideChina;

            // load data from china
            const china = $('p:contains("Mainland China")').next();
            let confirmed = 0;
            china.find('td').each((i, td) => {
                let children = $(td).contents();
                let previous = null;
                children.each((i, child) => {
                    let current = $(child).text().trim();
                    if (previous === 'Confirmed:')
                        confirmed += parseInt(current.replace(/,/g, ''));
                    previous = current;
                });
            });
            result.unshift({ country: new Tp.Value.Entity('cn', 'China') , confirmed, death });

            return result;
        });
    }
};
