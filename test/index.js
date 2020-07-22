// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2018 Google LLC
//
// See LICENSE for details
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
    if (!manifest) // FIXME
        return new devClass(_engine, { kind: deviceKind });

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
async function testOne(release, deviceKind) {
    // load the test class first
    let testsuite;
    try {
        testsuite = require('./' + release + '/' + deviceKind);
    } catch(e) {
        console.log('No tests found for ' + release + '/' +     deviceKind);
        // exit with no error and without loading the device
        // class (which would pollute code coverage statistics)
        return;
    }

    // now load the device through the TpClient loader code
    // (which will initialize the device class with stuff like
    // the OAuth helpers and the polling implementation of subscribe_*)

    _engine.platform.setRelease(release);
    const devClass = await _tpFactory.getDeviceClass(deviceKind);
    const manifest = devClass.manifest;

    // require the device once fully (to get complete code coverage)
    if (manifest && manifest.loader.module === 'org.thingpedia.v2')
        require('../' + release + '/' + deviceKind);

    console.log('# Starting tests for ' + release + '/' + deviceKind);
    try {
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
            console.log('FAILED: skipped tests for ' + release + '/' + deviceKind + ': missing credentials');
            _anyFailed = true;
            return;
        }

        assertNonEmptyString(instance.name);
        assertNonEmptyString(instance.description);
        assertNonEmptyString(instance.uniqueId);

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
    } finally {
        console.log('# Completed tests for ' + release + '/' + deviceKind);
    }
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

async function toTest(argv) {
    let devices = new Set();

    for (let arg of argv.slice(2)) {
        if (arg.indexOf('/') >= 0) {
            devices.add(arg);
        } else {
            for (let kind of await util.promisify(fs.readdir)(path.resolve(path.dirname(module.filename), '..', arg)))
                devices.add(arg + '/' + kind);
        }
    }

    return devices;
}

async function main() {
    // takes either (1) device names to test, or (2) release channel to test
    for (let device of await toTest(process.argv)) {
        let [release, kind] = device.split('/');
        if (!await existsSafe(release + '/' + kind + '/manifest.tt')) //'
            continue;

        await testOne(release, kind);
    }

    if (_anyFailed)
        process.exit(1);
}
main();
