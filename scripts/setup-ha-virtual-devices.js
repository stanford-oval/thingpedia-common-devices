#!/usr/bin/env node
// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2021 The Board of Trustees of the Leland Stanford Junior University
//
// Redistribution and use in source and binary forms, with or
// without modification, are permitted provided that the following
// conditions are met:
//
// 1. Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above
//    copyright notice, this list of conditions and the following
//    disclaimer in the documentation and/or other materials
//    provided with the distribution.
// 3. Neither the name of the copyright holder nor the names of its
//    contributors may be used to endorse or promote products derived
//    from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
// INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
// SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
// HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
// STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED
// OF THE POSSIBILITY OF SUCH DAMAGE.
"use strict";

const Tp = require('thingpedia');
const { promises : pfs } = require('fs');
const path = require('path');

const BASE_URL = 'http://127.0.0.1:8123/api';

// if this is updated, the config in test/data/homeassistant must be rebuilt
// and the credentials in test/credentials/io.home-assistant.json updated as well
const ACCESS_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJkMzQ1NDY2MmJjZmI0OWJlYjk0YTg5MzhmNzY3NWI3ZiIsImlhdCI6MTYxODU2NzE4MiwiZXhwIjoxOTMzOTI3MTgyfQ.tQ8E2YkUIPYf0NjvcNsR7r1A7jLRQXp0Np4jdxPdDaM';

function randint(low, high, rng = Math.random) {
    return Math.round(low + (high - low) * rng());
}

function uniform(array, rng = Math.random) {
    return array[Math.floor(rng() * array.length)];
}

function generateState(rule) {
    const val_range = rule.rng.split(',');
    switch (rule.k) {
        case 'state':
            return uniform(val_range);
        case 'number': {
            let min = Math.ceil(val_range[0]);
            let max = Math.floor(val_range[1]);
            return randint(min, max);
        }
        default:
            throw new TypeError(`Invalid initialization rule ${rule.k}`);
    }
}

function getHADevicesForDevice(device) {
    const config = require(path.resolve(device, './eval/virtual-devices.json'));

    return config.map((obj) => {
       return {
            "entity_id": obj.ha.domain + "." + obj.ha.entity_id,
            "state": generateState(obj.ha.init_call.i_state),
            "attributes": obj.ha.init_call.attrib
        };
    });
}

async function exists(filename) {
    try {
        await pfs.access(filename);
        return true;
    } catch(e) {
        return false;
    }
}

async function findAllDevices(release) {
    const devices = [];
    for (const dirent of await pfs.readdir(release, { withFileTypes: true })) {
        if (!dirent.isDirectory())
            continue;

        if (!await exists(path.resolve(release, dirent.name, 'eval/virtual-devices.json')))
            continue;

        devices.push(release + '/' + dirent.name);
    }

    return devices;
}

async function processDevices(devices) {
    for (const device of devices) {
        console.log(`Creating Home Assistant virtual devices for ${device}`);

        const sensors = await getHADevicesForDevice(device);
        for (const sensor of sensors)
            await uploadHADevice(sensor);
    }
}

async function uploadHADevice(obj) {
    const url = BASE_URL + '/states/' + obj.entity_id;
    await Tp.Helpers.Http.post(url, JSON.stringify(obj), {
        auth: `Bearer ${ACCESS_TOKEN}`
    });
    console.log(`Created Home Assistant entity ${obj.entity_id}`);
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0) {
        console.error(`Specify which releases or devices to configure on the command-line`);
        return;
    }

    for (const arg of args) {
        let devices;
        if (arg.includes('/'))
            devices = [arg];
        else
            devices = await findAllDevices(arg);

        await processDevices(devices);
    }
}
main();
