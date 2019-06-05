// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Silei Xu <silei@stanford.edu>
//
// See COPYING for details
"use strict";

const Tp = require('thingpedia');

const BASE_URL = 'http://api.giphy.com/v1/gifs/random?api_key=';

module.exports = class Giphy extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'com.giphy';
        this.name = "Giphy";
        this.description = "A GIF a day keeps the doctor away.";
        this.url = BASE_URL + this.constructor.metadata.auth.api_key;
    }

    get_get({ tag }) {
        let url = this.url;
        if (tag)
            url += '&tag=' + encodeURIComponent(tag);
        return Tp.Helpers.Http.get(url).then((response) => {
            var parsed = JSON.parse(response);
            return [{ tag, picture_url: parsed["data"]["image_url"] }];
        });
    }
};
