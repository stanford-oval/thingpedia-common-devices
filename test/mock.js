// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2018 The Board of Trustees of the Leland Stanford Junior University
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
const fs = require('fs');
const util = require('util');
const ThingTalk = require('thingtalk');
const Tp = require('thingpedia');

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

const _contentApi = {
    getStream(url) {
        return new Promise((resolve, reject) => {
            if (url.startsWith('file:///')) {
                const path = url.substring('file://'.length);
                child_process.execFile('xdg-mime', ['query', 'filetype', path], (err, stdout, stderr) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    let stream = fs.createReadStream(path);
                    stream.contentType = String(stdout).trim();
                    resolve(stream);
                });
            } else {
                reject(new Error('Unsupported url ' + url));
            }
        });
    }
};

class ThingpediaClient extends Tp.HttpClient {
    constructor(platform) {
        super(platform, 'https://thingpedia.stanford.edu/thingpedia');

        this._cachedManifests = new Map;
    }

    async getDeviceManifest(deviceKind) {
        if (this._cachedManifests.has(deviceKind))
            return this._cachedManifests.get(deviceKind);

        const manifestPath = path.resolve(path.dirname(module.filename), '../' + deviceKind + '/manifest.tt');
        const ourMetadata = (await util.promisify(fs.readFile)(manifestPath)).toString();
        const ourParsed = ThingTalk.Grammar.parse(ourMetadata);
        ourParsed.classes[0].annotations.version = new ThingTalk.Ast.Value.Number(-1);

        try {
            // ourMetadata might lack some of the fields that are in the
            // real metadata, such as api keys and OAuth secrets
            // for that reason we fetch the metadata for thingpedia as well,
            // and fill in any missing parameter
            const officialMetadata = await super.getDeviceCode(deviceKind);
            const officialParsed = ThingTalk.Grammar.parse(officialMetadata);

            const ourConfig = ourParsed.classes[0].config;

            ourConfig.in_params = ourConfig.in_params.filter((ip) => !ip.value.isUndefined);
            const ourConfigParams = new Set(ourConfig.in_params.map((ip) => ip.name));
            const officialConfig = officialParsed.classes[0].config;

            for (let in_param of officialConfig.in_params) {
                if (!ourConfigParams.has(in_param.name))
                    ourConfig.in_params.push(in_param);
            }

        } catch(e) {
            if (e.code !== 404)
                throw e;
        }

        this._cachedManifests.set(deviceKind, ourParsed.classes[0]);
        return ourParsed.classes[0];
    }

    async getDeviceCode(deviceKind) {
        return (await this.getDeviceManifest(deviceKind)).prettyprint();
    }

    async getModuleLocation(id) {
        return 'file://' + path.resolve(path.dirname(module.filename), '../' + id);
    }
}

function getGitConfig(key, _default) {
    try {
        const args = ['config', '--get', '--default', _default || '', key];
        const stdout = child_process.execFileSync('git', args);
        return String(stdout).trim() || _default;
    } catch(e) {
        // ignore error if git is not installed
        if (e.code !== 'ENOENT')
            throw e;
        // also ignore error if the key
        return _default;
    }
}

class TestPlatform extends Tp.BasePlatform {
    constructor() {
        super();

        this._thingpedia = new ThingpediaClient(this);

        this._developerKey = getGitConfig('thingpedia.developer-key', process.env.THINGENGINE_DEVELOPER_KEY || null);
    }

    getDeveloperKey() {
        return this._developerKey;
    }
    get type() {
        return 'test';
    }
    get locale() {
        return 'en-US';
    }
    get timezone() {
        return 'America/Los_Angeles';
    }

    getCacheDir() {
        return path.dirname(module.filename);
    }
    getTmpDir() {
        return os.tmpdir();
    }
    hasCapability(cap) {
        switch (cap) {
        case 'code-download':
        case 'content-api':
        case 'thingpedia-client':
            return true;
        default:
            return false;
        }
    }
    getCapability(cap) {
        switch (cap) {
        case 'code-download':
            return _unzipApi;
        case 'content-api':
            return _contentApi;
        case 'thingpedia-client':
            return this._thingpedia;
        default:
            return null;
        }
    }
}

class TestEngine extends Tp.BaseEngine {
    constructor() {
        super(new TestPlatform);
    }
    get devices() {
        throw assert.fail('nothing should call this');
    }
    get apps() {
        throw assert.fail('nothing should call this');
    }
    get stats() {
        throw assert.fail('nothing should call this');
    }
}
module.exports = new TestEngine;
