// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

// Parse a .jsonld file and normalize it based on how we expect schema.org to look like

const fs = require('fs');
const util = require('util');
//const assert = require('assert');
const ThingTalk = require('thingtalk');
const uuid = require('uuid');
const deq = require('deep-equal');

const meta = require('../../org.schema/meta.json');

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;
function parseDuration(form) {
    const match = /^P([0-9]+Y)?([0-9]+M)?([0-9]+D)?T?([0-9]+H)?([0-9]+M)?([0-9]+S)?/.exec(form);

    const [, year, month, day, hour, minute, second] = match;

    let value = 0;
    if (year)
        value += parseInt(year) * YEAR;
    if (month)
        value += parseInt(month) * MONTH;
    if (day)
        value += parseInt(day) * DAY;
    if (hour)
        value += parseInt(hour) * HOUR;
    if (minute)
        value += parseInt(minute) * MINUTE;
    if (second)
        value += parseInt(second) * SECOND;
    return value;
}

function parseMeasure(str) {
    const match = /^(-?(?:(?:0|[1-9][0-9]*)\.[0-9]*(?:[eE][+-]?[0-9]+)?|\.[0-9]+(?:[eE][+-]?[0-9]+)?|(?:0|[1-9][0-9]*)(?:[eE][+-]?[0-9]+)?))\s+([a-zA-Z]+)$/.exec(str);
    if (!match) {
        console.error(`Invalid measurement value ${str}`);
        return undefined;
    }

    const [, value, unit] = match;
    if (!ThingTalk.Units.UnitsToBaseUnit[unit]) {
        console.error(`Invalid measurement unit ${unit}`);
        return undefined;
    }

    return ThingTalk.Units.transformToBaseUnit(parseFloat(value), unit);
}

function processObject(value, type, output) {
    if (!output)
        throw new Error('???');
    const typemeta = meta[type];
    if (!typemeta) {
        console.error(`Unrecognized object type ${type}`);
        return undefined;
    }

    for (let base of typemeta.extends) {
        if (!processObject(value, base, output))
            return undefined;
    }

    for (let field in typemeta.fields) {
        const expectedType = typemeta.fields[field];
        value[field] = processField(value[field], [type, field], expectedType, output);
    }

    if (type === value['@type']) {
        // at the bottom of the type hierarchy, we also check for @id and add to the output

        if (!output[type])
            output[type] = {};

        // if we already have an ID, we're done
        if (value['@id']) {
            output[type][value['@id']] = value;
            //console.error((output['Restaurant'] || []).length);
            return value['@id'];
        }

        // otherwise we're going to make one up
        //
        // see if we already have an object that is identical to this one

        value['@id'] = undefined;
        if (type !== 'Review' && type !== 'Person') { // but now for review or person, there are too many and it's slow
            for (let candidateId in output[type]) {
                const candidate = output[type][candidateId];
                // ignore the ID in comparison
                candidate['@id'] = undefined;
                const good = deq(candidate, value, { strict: true });
                candidate['@id'] = candidateId;
                if (good)
                    return candidateId;
            }
        }

        // nope, make up a new object
        value['@id'] = 'https://thingpedia.stanford.edu/ns/uuid/' + type + '/' + uuid.v4();
        output[type][value['@id']] = value;

        return value['@id'];
    }

    return true;
}

function processField(value, path, expectedType, output) {
    if (!output)
        throw new Error('???');
    if (value === null || value === undefined) {
        if (expectedType.isArray)
            return [];
        else
            return undefined;
    }

    if (expectedType.isArray && !Array.isArray(value)) {
        value = [value];
    } else if (!expectedType.isArray && Array.isArray(value)) {
        console.error(`Unexpected array in ${path.join('.')}`);
        if (value.length === 0)
            return undefined;
        value = value[0];
    }

    if (expectedType.isArray) {
        const innerExpected = { isArray: false, type: expectedType.type };

        const newArray = [];
        for (let i = 0; i < value.length; i++) {
            path.push(i);
            const newValue = processField(value[i], path, innerExpected, output);
            if (newValue !== undefined)
                newArray.push(newValue);
            path.pop();
        }
        return newArray;
    }

    if (typeof expectedType.type === 'string') {
        // entity of builtin type

        if (expectedType.type.startsWith('tt:')) {
            if (typeof value === 'object') {
                if (expectedType.type === 'tt:Entity' && value.url)
                    return String(value.url);

                console.error(`Unexpected object in ${path.join('.')}, expected a ${expectedType.type}`);
                console.error(value);


                return undefined;
            }

            if (expectedType.type === 'tt:Number') {
                return parseFloat(value);
            } else if (expectedType.type === 'tt:Duration') {
                return parseDuration(value);
            } else if (expectedType.type === 'tt:Measure') {
                return parseMeasure(value);
            } else if (expectedType.type.startsWith('tt:Enum(')) {
                const enumerands = expectedType.type.substring('tt:Enum('.length, expectedType.type.length-1).split(/,/g);
                if (!enumerands.includes(value)) {
                    console.error(`Expected enumerated value in ${path.join('.')}, got`, value);
                    return undefined;
                }
                return value;
            } else {
                return String(value);
            }
        } else {
            if (typeof value === 'object') {
                let nestedtype = value['@type'];
                if (!nestedtype) {
                    //console.error(`Nested object has no @type in ${path.join('.')}, assuming ${expectedType.type}`);

                    // add a type and hope for the best
                    nestedtype = value['@type'] = expectedType.type;
                }
                return processObject(value, nestedtype, output);
            } else {
                value = String(value);

                if (!value.startsWith('http')) {
                    // not URI-like, make up something

                    return processObject({ name: value, '@type': expectedType.type }, expectedType.type, output);
                } else {
                    return value;
                }
            }
        }
    } else {
        // compound type

        if (typeof value !== 'object') {
            console.error(`Expected object in ${path.join('.')}, got`, value);

            // if we have a name, make up something...
            if ('name' in expectedType.type)
                return { name: value };
            else
                return undefined;
        }

        for (let field in expectedType.type) {
            path.push(field);
            value[field] = processField(value[field], path, expectedType.type[field], output);
            path.pop();
        }

        return value;
    }
}

async function processFilename(filename, output) {
    console.error('filename', filename);
    let input = JSON.parse(await util.promisify(fs.readFile)(filename), { encoding: 'utf8' });


    if (!Array.isArray(input))
        input = [input];

    for (let value of input) {
        const type = value['@type'];
        if (!type) {
            console.error(`Top-level object has no @type`, value);
            continue;
        }
        processObject(value, type, output);
    }
}

async function main() {
    const output = {};

    for (let filename of process.argv.slice(2))
        await processFilename(filename, output);

    console.log(JSON.stringify(output, undefined, 2));
}
main();
