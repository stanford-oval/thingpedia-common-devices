// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2018 Google LLC
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const mysql = require('mysql');
const fs = require('fs');

function safeMkdirSync(dir) {
    try {
        fs.mkdirSync(dir);
    } catch(e) {
        if (e.code !== 'EEXIST')
            throw e;
    }
}

async function main() {
    const db = mysql.createConnection(process.env.DATABASE_URL);

    const query = db.query(`select primary_kind,source_code from device_class where owner = 1`);
    query.on('result', (row) => {
        safeMkdirSync('./' + row.primary_kind);
        if (row.source_code)
            fs.writeFileSync('./' + row.primary_kind + '/manifest.tt', row.source_code.replace(/\r/g, ''));
    });
    query.on('end', () => db.end());
}
main();
