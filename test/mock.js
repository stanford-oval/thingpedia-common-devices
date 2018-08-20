// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2018 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const assert = require('assert');
if (!assert.rejects) {
    // added in node 9.*, we still support (and mostly use) 8.*

    assert.rejects = async function rejects(promise, error, message) {
        if (typeof promise === 'function')
            promise = promise();

        try {
            await promise;
            try {
                assert.fail("Expected a rejected promise");
            } catch(e) {
                return Promise.reject(e);
            }
        } catch(e) {
            assert.throws(() => { throw e; }, error, message);
        }
        return Promise.resolve();
    };
}

const path = require('path');
const child_process = require('child_process');
const os = require('os');

const _unzipApi = {
    unzip(zipPath, dir) {
        var args = ['-uo', zipPath, '-d', dir];
        return new Promise((resolve, reject) => {
            child_process.execFile('/usr/bin/unzip', args, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
                if (err)
                    reject(err);
                else
                    resolve([stdout, stderr]);
            });
        }).then(([stdout, stderr]) => {
            console.log('stdout', stdout);
            console.log('stderr', stderr);
        });
    }
};

const mockPlatform = {
    getDeveloperKey() {
        if (!process.env.THINGENGINE_DEVELOPER_KEY)
            throw new Error('Invalid test setup: missing THINGENGINE_DEVELOPER_KEY');
        return process.env.THINGENGINE_DEVELOPER_KEY;
    },
    get locale() {
        return 'en-US';
    },
    get timezone() {
        return 'America/Los_Angeles';
    },

    getCacheDir() {
        return path.dirname(module.filename);
    },
    getTmpDir() {
        return os.tmpdir();
    },
    hasCapability(cap) {
        switch (cap) {
        case 'code-download':
            return true;
        default:
            return false;
        }
    },
    getCapability(cap) {
        switch (cap) {
        case 'code-download':
            return _unzipApi;
        default:
            return null;
        }
    }
};

const mockEngine = {
    get platform() {
        return mockPlatform;
    },
    get ownTier() {
        return 'desktop';
    },
    get devices() {
        throw assert.fail('nothing should call this');
    },
    get apps() {
        throw assert.fail('nothing should call this');
    },
    get stats() {
        throw assert.fail('nothing should call this');
    }
};
module.exports = mockEngine;