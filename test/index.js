// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2018 Google LLC
//           2019 The Board of Trustees of the Leland Stanford Junior University
//
// Redistribution and use in source and binary forms, with or
// without modification, are permitted provided that the following
// conditions are met:
//
// 1. Redistributions of source code must retain the above copyright
//   notice, this list of conditions and the following disclaimer.
//
// 2. Redistributions in binary form must reproduce the above
//   copyright notice, this list of conditions and the following
//   disclaimer in the documentation and/or other materials
//   provided with the distribution.
//
// 3. Neither the name of the copyright holder nor the names of its
//    contributors may be used to endorse or promote products derived
//   from this software without specific prior written permission.
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
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
"use strict";

process.on('unhandledRejection', (up) => { throw up; });
process.env.TEST_MODE = '1';

const assert = require('assert');
const util = require('util');
const fs = require('fs');
const path = require('path');

const Tp = require('thingpedia');

const _engine = require('./mock');
const _tpFactory = new Tp.DeviceFactory(_engine, _engine.thingpedia, {});

async function createDeviceInstance(deviceKind, manifest, devClass) {
    const config = manifest.config;
    if (config.module === 'org.thingpedia.config.none')
        return new devClass(_engine, { kind: deviceKind });
    if (config.module === 'org.thingpedia.config.basic_auth' ||
        config.module === 'org.thingpedia.config.form') {
        // credentials are stored in test/[DEVICE ID].cred.json
        const credentialsPath = path.resolve('./test', deviceKind + '.cred.json');
        const args = require(credentialsPath);
        args.kind = deviceKind;
        return new devClass(_engine, args);
    }

    // otherwise do something else...
    return null;
}

async function testQuery(instance, functionName, input, expected) {
    if (typeof input === 'function')
        input = input(instance);

    const result = await instance['get_' + functionName](input);
    if (typeof expected === 'function') {
        expected(result, input, instance);
        return;
    }

    if (!Array.isArray(expected))
        expected = [expected];

    assert.deepStrictEqual(result, expected);
}

async function runTest(instance, test) {
    if (typeof test === 'function') {
        await test(instance);
        return;
    }

    let [testType, functionName, input, expected] = test;

    switch (testType) {
    case 'query':
        await testQuery(instance, functionName, input, expected);
        break;
    case 'monitor':
        // do something
        break;
    case 'action':
        // do something
        break;
    }
}

function assertNonEmptyString(what) {
    assert(typeof what === 'string' && what, 'Expected a non-empty string, got ' + what);
}

let _anyFailed = false;
async function testOne(deviceKind) {
    // load the test class first
    let testsuite;
    try {
        testsuite = require('./' + deviceKind);
    } catch(e) {
        console.log('No tests found for ' + deviceKind);
        // exit with no error and without loading the device
        // class (which would pollute code coverage statistics)
        return;
    }

    // require the device once fully (to get complete code coverage)
    require('../' + deviceKind);

    // now load the device through the TpClient loader code
    // (which will initialize the device class with stuff like
    // the OAuth helpers and the polling implementation of subscribe_*)

    const manifest = await _engine.thingpedia.getDeviceManifest(deviceKind);
    const devClass = await _tpFactory.getDeviceClass(deviceKind);

    if (typeof testsuite === 'function') {
        // if the testsuite is a function, we're done here
        await testsuite(devClass);
        return;
    }

    let instance = null;
    if (!Array.isArray(testsuite)) {
        const meta = testsuite;
        testsuite = meta.tests;
        if (meta.setUp)
            instance = await meta.setUp(devClass);
    }
    if (instance === null)
        instance = await createDeviceInstance(deviceKind, manifest, devClass);
    if (instance === null) {
        console.log('FAILED: skipped tests for ' + deviceKind + ': missing credentials');
        _anyFailed = true;
        return;
    }

    assertNonEmptyString(instance.name);
    assertNonEmptyString(instance.description);
    assertNonEmptyString(instance.uniqueId);

    console.log('# Starting tests for ' + deviceKind);
    for (let i = 0; i < testsuite.length; i++) {
        console.log(`## Test ${i+1}/${testsuite.length}`);
        const test = testsuite[i];
        try {
            await runTest(instance, test);
        } catch(e) {
            console.log('## FAILED: ' + e.message);
            console.log(e.stack);
            _anyFailed = true;
        }
    }
    console.log('# Completed tests for ' + deviceKind);
}

async function existsSafe(path) {
    try {
        await util.promisify(fs.access)(path);
        return true;
    } catch(e) {
        if (e.code === 'ENOENT')
            return false;
        if (e.code === 'ENOTDIR')
            return false;
        throw e;
    }
}

async function main() {
    if (process.argv.length > 2) {
        for (let toTest of process.argv.slice(2))
             await testOne(toTest);
    } else {
        for (let name of await util.promisify(fs.readdir)(path.resolve(path.dirname(module.filename), '..'))) {
            if (!await existsSafe(name + '/manifest.tt')) //'
                continue;

            console.log(name);
            await testOne(name);
        }
    }

    if (_anyFailed)
        process.exit(1);
}
main();
