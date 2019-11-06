// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Juan Vimberg <jvimberg@stanford.edu>
//                Tucker L. Ward <tlward@stanford.edu>
//                Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

const SERVER_TOKEN = "ZLM0ZjMxXT1KXzxugPc3DX5vBSFTwPRr7R2D0mK_";

module.exports = {
    get: function(url) {
        return Tp.Helpers.Http.get(url, { auth: 'Token ' + SERVER_TOKEN }).then((response) => {
            return JSON.parse(response);
        });
    },

    post: function(url, data) {
        return Tp.Helpers.Http.post(url, JSON.stringify(data), {
            auth: 'Token ' + SERVER_TOKEN,
            dataContentType: 'application/json' }).then((response) => {
            return JSON.parse(response);
        });
    }
};
