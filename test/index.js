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

const TpClient = require('thingpedia-client');
const mockEngine = require('./mock');

const _tpClient = new TpClient.HttpClient(mockEngine.platform, 'https://thingpedia.stanford.edu/thingpedia');
mockEngine.thingpedia = _tpClient;
const _tpDownloader = new TpClient.ModuleDownloader(mockEngine.platform, _tpClient, {});

function getDeviceFactory() {
    if (this._loading)
        return Promise.resolve(this._loading);
    this._modulePath = path.resolve(path.dirname(module.filename), '../build/' + this._id);
    var cached = this._loadJsModule();
    assert(cached);
    return Promise.resolve(this._loading = cached);
}
// monkey patch the loading code for JS device classes so we use our
// code rather than downloading from Thingpedia
TpClient.Modules['org.thingpedia.v2'].prototype.getDeviceFactory = getDeviceFactory;
TpClient.Modules['org.thingpedia.v1'].prototype.getDeviceFactory = getDeviceFactory;

async function loadDeviceFactory(deviceKind) {
    const ourMetadata = require('../' + deviceKind + '.json');

    // ourMetadata might lack some of the fields that are in the
    // real metadata, such as api keys and OAuth secrets
    // for that reason we fetch the metadata for thingpedia as well,
    // and fill in any missing parameter
    const officialMetadata = await _tpClient.getDeviceCode(deviceKind);

    for (let name in officialMetadata.auth) {
        if (!ourMetadata[name])
            ourMetadata[name] = officialMetadata[name];
    }

    const module = new (TpClient.Modules[ourMetadata.module_type])(deviceKind, ourMetadata, _tpDownloader);

    return module.getDeviceFactory();
}

async function createDeviceInstance(deviceKind, factory) {
    if (factory.metadata.auth.type === 'none')
        return new factory(mockEngine, { kind: deviceKind });

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
    require('../build/' + deviceKind);

    // now load the device through the TpClient loader code
    // (which will initialize the device class with stuff like
    // the OAuth helpers and the polling implementation of subscribe_*)

    const factory = await loadDeviceFactory(deviceKind);

    if (typeof testsuite === 'function') {
        // if the testsuite is a function, we're done here
        await testsuite(factory, _tpDownloader);
        return;
    }

    let instance = null;
    if (!Array.isArray(testsuite)) {
        const meta = testsuite;
        testsuite = meta.tests;
        if (meta.setUp)
            instance = await meta.setUp(_tpDownloader);
    }
    if (instance === null)
        instance = await createDeviceInstance(deviceKind, factory);
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

async function main() {
    if (process.argv.length > 2) {
        for (let toTest of process.argv.slice(2))
             await testOne(toTest);
    } else {
        for (let name of await util.promisify(fs.readdir)(path.resolve(path.dirname(module.filename), '..'))) {
            if (name.startsWith('.') || name === 'package.json' ||
               !name.endsWith('.json'))
               continue;

            const deviceKind = name.substring(0, name.length - '.json'.length);
            await testOne(deviceKind);
        }
    }

    if (_anyFailed)
        process.exit(1);
}
main();
