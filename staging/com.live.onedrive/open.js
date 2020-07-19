// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 {jasonf2, kkiningh}@stanford.edu
//           2018 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

module.exports = class OneDriveOpen extends Tp.BaseChannel {
    invokeQuery([file_name]) {
        console.log(file_name);
        if (!file_name.startsWith('/'))
            file_name = '/' + file_name;
        const url = 'https://graph.microsoft.com/v1.0/me/drive/root:' + encodeURI(file_name) + ':/content';
        console.log(url);
        return Tp.Helpers.Http.get(url, {
            useOAuth2: this.device,
            followRedirects: false
        }).catch((e) => {
            if (e.code !== 302)
                throw e;
            return [[file_name, e.redirect]];
        });
    }
};
