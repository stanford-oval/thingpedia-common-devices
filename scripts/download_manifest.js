// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2018 Google LLC
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const TpClient = require('thingpedia-client');
const mockEngine = require('../test/mock');

const _tpClient = new TpClient.HttpClient(mockEngine.platform, 'https://thingpedia.stanford.edu/thingpedia');

async function main() {
    const kind = process.argv[2];
    let manifest;
    try {
        manifest = await _tpClient.getDeviceCode(kind);
    } catch(e) {
        console.error('Failed to download ' + kind, e);
        return;
    }

    for (let name in manifest.auth) {
        if (name === 'type')
            continue;
        delete manifest.auth[name];
    }
    delete manifest.version;
    delete manifest.developer;

    process.stdout.write(JSON.stringify(manifest, undefined, 4));
    process.stdout.write('\n');
}
main();
