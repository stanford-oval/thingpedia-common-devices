// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

// Parse a .TT file and extract some meta information, in JSON format

const fs = require('fs');
const util = require('util');
const assert = require('assert');
const ThingTalk = require('thingtalk');

const LOCATION_TYPE = {
    latitude: { isArray: false, type: 'tt:Number' },
    longitude: { isArray: false, type: 'tt:Number' }
};

function makeMetadata(args) {
    const meta = {};

    for (let arg of args) {
        const type = arg.type;
        const name = arg.name;
        if (name === 'id')
            continue;
        if (name.indexOf('.') >= 0)
            continue;

        let ptype = type;
        if (type.isArray)
            ptype = type.elem;
        assert(!ptype.isArray);

        let typemeta;
        if (ptype.isEntity && ptype.type.startsWith('org.schema:'))
            typemeta = ptype.type.substring('org.schema:'.length);
        else if (ptype.isEntity)
            typemeta = 'tt:Entity';
        else if (ptype.isMeasure && ptype.unit === 'ms')
            typemeta = 'tt:Duration';
        else if (ptype.isMeasure)
            typemeta = 'tt:Measure';
        else if (ptype.isCompound)
            typemeta = makeMetadata(Object.values(ptype.fields));
        else if (ptype.isLocation)
            typemeta = LOCATION_TYPE;
        else
            typemeta = 'tt:' + ptype;

        meta[name] = {
            isArray: type.isArray,
            type: typemeta
        };
    }

    return meta;
}

async function main() {
    const manifest = await util.promisify(fs.readFile)('./org.schema/manifest.tt', { encoding: 'utf8' });
    const parsed = ThingTalk.Grammar.parse(manifest);

    assert(parsed.isLibrary && parsed.classes.length === 1 && parsed.classes[0].kind.startsWith('org.schema'));
    const classDef = parsed.classes[0];

    const functions = {};

    for (let fn in classDef.queries) {
        const fndef = classDef.queries[fn];
        functions[fn] = {
            extends: fndef.extends,
            fields: makeMetadata(fndef.args.map((argname) => fndef.getArgument(argname)))
        };
    }

    console.log(JSON.stringify(functions, undefined, 2));
}
main();
