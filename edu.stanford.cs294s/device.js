// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2019 Silei Xu <silei@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const Tp = require('thingpedia');
const url = 'https://web.stanford.edu/class/cs294s/';
const cheerio = require('cheerio');

module.exports = class CS294S extends Tp.BaseDevice {
    get_slides() {
        return Tp.Helpers.Http.get(url).then((res) => {
            const $ = cheerio.load(res);
            const output = [];
            $('.class_slides').each((i, slides) => {
                output.push({ link: url + $(slides).attr('href') });
            });

            return output;
        });
    }
};