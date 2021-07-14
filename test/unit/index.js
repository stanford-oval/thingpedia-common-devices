// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2018 Google LLC
//           2018-2020 The Board of Trustees of the Leland Stanford Junior University
//
// See LICENSE for details
"use strict";

process.on('unhandledRejection', (up) => { throw up; });
process.env.TEST_MODE = '1';

const uuid = require('uuid');
const assert = require('assert');
const util = require('util');
const fs = require('fs');
const path = require('path');
const Genie = require('genie-toolkit');

const Platform = require('../lib/platform');
const { initializeCredentials } = require('../lib/cred-utils');

function assertNonEmptyString(what) {
    assert(typeof what === 'string' && what, 'Expected a non-empty string, got ' + what);
}


async function existsSafe(path) {
    try {
        await util.promisify(fs.access)(path);
        return true;
    } catch (e) {
        if (e.code === 'ENOENT')
            return false;
        if (e.code === 'ENOTDIR')
            return false;
        throw e;
    }
}

async function sleep(timeout) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, timeout);
    });
}

// mock a subset of ExecEnvironment sufficient for testing
class MockExecEnvironment {
    constructor() {
        this.app = {
            uniqueId: 'uuid-' + uuid.v4()
        };
    }
}

async function collectAll(iterable) {
    const array = [];
    for await (const element of iterable)
        array.push(element);
    return array;
}

class TestRunner {
    constructor() {
        this._platform = new Platform();
        this._engine = new Genie.AssistantEngine(this._platform, {
            cloudSyncUrl: 'https://dev.almond.stanford.edu'
        });

        this.anyFailed = false;
    }

    async start() {
        await this._engine.open();

        await Promise.all([
             // initialize the credentials from the test directory
            initializeCredentials(this._engine),

            (async () => {
                // if cloud sync is set up, we'll download the credentials of the devices to
                // test from almond-dev
                // sleep for 30 seconds while that happens
                if (this._platform.getCloudId()) {
                    console.log('Waiting for cloud sync to complete...');
                    await sleep(30000);
                }
            })()
        ]);
    }
    stop() {
        return this._engine.close();
    }

    async _getOrCreateDeviceInstance(deviceKind, manifest, devClass) {
        const existing = this._engine.devices.getAllDevicesOfKind(deviceKind);
        if (existing.length > 0) {
            if (devClass) {
                assert(existing.some((d) => d.constructor === devClass));
                return existing.find((d) => d.constructor === devClass);
            } else {
                return existing[0];
            }
        }

        if (!manifest) // FIXME
            return this._engine.createSimpleDevice(deviceKind);

        const config = manifest.config;
        if (config.module === 'org.thingpedia.config.none')
            return this._engine.createSimpleDevice(deviceKind);

        // otherwise do something else...
        return null;
    }

    async _findQuery(kind, name) {
        try {
            return await this._engine.schemas.getMeta(kind, 'query', name);
        } catch(e) {
            // ignore error
        }

        const classDef = await this._engine.schemas.getFullMeta(kind);
        for (const extend of classDef.extends||[]) {
            try {
                return await this._findQuery(extend, name);
            } catch(e) {
                // ignore error
            }
        }

        throw new Error(`Could not find query ${name} in @${kind} or its parent classes`);
    }

    _isPlainObject(value) {
        // check that it is an object, its prototype is object prototype, and it is not an array, iterator, or promise
        if (typeof value !== 'object')
            return false;

        const proto = Object.getPrototypeOf(value);
        return (proto === null || proto === Object.prototype)
            && !Array.isArray(value)
            && typeof value.next !== 'function'
            && typeof value.then !== 'function';
    }

    _checkType(fndef, arg, type, value) {
        if (value === null || value === undefined)
            return;
        if (type.isCompound) {
            assert(this._isPlainObject(value), `Expected a plain object for compound field @${fndef.qualifiedName}:${arg}`);
            for (const key in type.fields)
                this._checkType(fndef, arg, type.fields[key], value);
        } else if (type.isArray) {
            assert(Array.isArray(value), `Expected an array for array field @${fndef.qualifiedName}:${arg}`);
            for (const v of value)
                this._checkType(fndef, arg, type.elem, v);
        } else if (type.isEntity) {
            assert(typeof value === 'string' ||
                (typeof value.value === 'string' &&
                 (typeof value.display === 'string' || value.display === null)),
                 `Expected an Entity object for value of type ${type} in field @${fndef.qualifiedName}:${arg}`);
        } else if (type.isBoolean) {
            assert(typeof value === 'boolean', `Expected a boolean for value of type ${type} in field @${fndef.qualifiedName}:${arg}`);
        } else if (type.isCurrency) {
            assert(typeof value.value === 'number' &&
                typeof value.code === 'string', `Expected a Currency object for value of type ${type} in field @${fndef.qualifiedName}:${arg}`);
        } else if (type.isDate) {
            assert(value instanceof Date, `Expected a Date object for value of type ${type} in field @${fndef.qualifiedName}:${arg}`);
        } else if (type.isEnum) {
            assert(type.entries.includes(value), `Expected one of ${type.entries.join(', ')} for value of type ${type} in field @${fndef.qualifiedName}:${arg}`);
        } else if (type.isLocation) {
            assert(typeof value.x === 'number' &&
            typeof value.y === 'number' &&
            (typeof value.display === 'string' || value.display === null),
            `Expected a Location object for value of type ${type} in field @${fndef.qualifiedName}:${arg}`);
        } else if (type.isMeasure || type.isNumber) {
            assert(typeof value === 'number', `Expected a number for value of type ${type} in field @${fndef.qualifiedName}:${arg}`);
        } else if (type.isRecurrentTimeSpecification) {
            assert(Array.isArray(value), `Expected an array for value of type ${type} in field @${fndef.qualifiedName}:${arg}`);
        } else if (type.isString) {
            assert(typeof value === 'string', `Expected a string for value of type ${type} in field @${fndef.qualifiedName}:${arg}`);
        } else if (type.isTime) {
            assert(typeof value.hour === 'number' &&
                typeof value.minute === 'number' &&
                typeof value.second === 'number', `Expected a Time object for value of type ${type} in field @${fndef.qualifiedName}:${arg}`);
        }
    }

    _checkAllTypes(fndef, results) {
        for (const result of results) {
            assert(this._isPlainObject(result), `Expected a plain object for each result in the result array`);

            for (const key in result) {
                const arg = fndef.getArgument(key);
                if (!arg)
                    console.log(`WARNING: ${fndef.qualifiedName} emitted spurious key ${key} not declared in Thingpedia`);
            }

            for (const arg of fndef.iterateArguments()) {
                if (arg.name.indexOf('.') >= 0)
                    continue;
                const value = result[arg.name];
                this._checkType(fndef, arg, arg.type, value);
            }
        }
    }

    async _testQuery(deviceKind, instance, functionName, input, hints, expected) {
        if (typeof input === 'function')
            input = input(instance);

        const env = new MockExecEnvironment();
        let result, error;
        try {
            result = await collectAll(await instance['get_' + functionName](input, hints, env));
        } catch(e) {
            error = e;
        }

        const fndef = await this._findQuery(deviceKind, functionName);

        if (typeof expected === 'function') {
            expected(error || result, input, hints, instance);
            return;
        }

        if (error) {
            const onError = fndef.metadata.on_error;
            assert(error.code in onError, `Thrown error with unknown code ${error.code}: ${error.message}`);
        } else {
            this._checkAllTypes(fndef, result);

            if (!Array.isArray(expected))
                expected = [expected];

            assert.deepStrictEqual(result, expected);
        }
    }

    async _runTest(deviceKind, instance, test) {
        if (typeof test === 'function') {
            await test(instance);
            return;
        }

        let testType, functionName, input, hints, expected;
        if (test.length >= 5)
            [testType, functionName, input, hints, expected] = test;
        else
            [testType, functionName, input, expected] = test;

        console.log(`Testing ${testType} @${deviceKind}.${functionName}`);
        switch (testType) {
            case 'query':
                await this._testQuery(deviceKind, instance, functionName, input, hints, expected);
                break;
            case 'monitor':
                // do something
                break;
            case 'action':
                // do something
                break;
        }
    }

    async *_iterateAllQueries(classDef) {
        for (const q in classDef.queries)
            yield classDef.queries[q];

        for (const extend of classDef.extends||[]) {
            const parent = await this._engine.schemas.getFullMeta(extend);
            yield* this._iterateAllQueries(parent);
        }
    }

    async _autoGenTests(testsuite, manifest) {
        queryloop: for await (const query of this._iterateAllQueries(manifest)) {
            // skip queries with input arguments
            for (const arg of query.iterateArguments()) {
                if (arg.is_input)
                    continue queryloop;
            }

            // skip this query if we already have a manually written test for it
            if (testsuite.find((test) => test[0] === 'query' && test[1] === query.name))
                continue;

            testsuite.push(['query', query.name, {}, {}, () => {}]);
        }
    }

    async testOne(release, deviceKind) {
        // load the device through the TpClient loader code
        // (which will initialize the device class with stuff like
        // the OAuth helpers and the polling implementation of subscribe_*)

        let devClass, manifest;

        try {
            const prefs = this._platform.getSharedPreferences();
            prefs.set('developer-dir', path.resolve(release));

            manifest = await this._engine.schemas.getFullMeta(deviceKind);

            // FIXME don't access private properties
            if (!manifest.is_abstract)
                devClass = await this._engine.devices._factory.getDeviceClass(deviceKind);
        } catch(e) {
            console.log(`## FAILED: Failed to load device ${deviceKind}: ${e.message}`);
            console.log(e.stack);
            this.anyFailed = true;
            return;
        }

        // load custom tests first
        let testsuite;
        try {
            testsuite = require('./' + release + '/' + deviceKind);
        } catch (e) {
            // ignore error
        }
        if (!testsuite && manifest.is_abstract)
            return;

        console.log(`# Starting tests for ${release}/${deviceKind}`);
        try {
            if (typeof testsuite === 'function') {
                // if the testsuite is a function, we're done here
                await testsuite(devClass);
                return;
            }

            let instance = null;
            if (!testsuite)
                testsuite = [];
            if (!Array.isArray(testsuite)) {
                const meta = testsuite;
                testsuite = meta.tests;
                if (meta.setUp)
                    instance = await meta.setUp(devClass);
            }
            if (!instance)
                instance = await this._getOrCreateDeviceInstance(deviceKind, manifest, devClass);
            if (!instance) {
                console.log(`FAILED: skipped tests for ${release}/${deviceKind}: missing credentials`);
                return;
            }

            await this._autoGenTests(testsuite, manifest);

            assertNonEmptyString(instance.name);
            assertNonEmptyString(instance.description);
            assertNonEmptyString(instance.uniqueId);

            for (let i = 0; i < testsuite.length; i++) {
                console.log(`## Test ${i + 1}/${testsuite.length}`);
                const test = testsuite[i];
                try {
                    await this._runTest(deviceKind, instance, test);
                } catch (e) {
                    console.log('## FAILED: ' + e.message);
                    console.log(e.stack);
                    this.anyFailed = true;
                }
            }
        } finally {
            console.log(`# Completed tests for ${release}/${deviceKind}`);
        }
    }

    async toTest(argv) {
        let devices = new Set();

        for (let arg of argv.slice(2)) {
            if (arg.indexOf('/') >= 0) {
                devices.add(arg);
            } else {
                for (let kind of await util.promisify(fs.readdir)(path.resolve(path.dirname(module.filename), '../..', arg)))
                    devices.add(arg + '/' + kind);
            }
        }

        return devices;
    }
}

async function main() {
    const runner = new TestRunner();
    await runner.start();

    // takes either (1) device names to test, or (2) release channel to test
    for (let device of await runner.toTest(process.argv)) {
        let [release, kind] = device.split('/');
        if (!await existsSafe(release + '/' + kind + '/manifest.tt')) //'
            continue;

        await runner.testOne(release, kind);
    }

    await runner.stop();
    if (runner.anyFailed)
        process.exit(1);
}
main();
