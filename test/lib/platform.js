// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of Genie
//
// Copyright 2020 The Board of Trustees of the Leland Stanford Junior University
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
"use strict";

// test platform

const Tp = require('thingpedia');
const Q = require('q');
const fs = require('fs');
const os = require('os');
const path = require('path');
const child_process = require('child_process');
const Gettext = require('node-gettext');

const THINGPEDIA_URL = 'https://almond-dev.stanford.edu/thingpedia';

var _unzipApi = {
    unzip(zipPath, dir) {
        var args = ['-uo', zipPath, '-d', dir];
        return Q.nfcall(child_process.execFile, '/usr/bin/unzip', args, {
            maxBuffer: 10 * 1024 * 1024 }).then((zipResult) => {
            var stdout = zipResult[0];
            var stderr = zipResult[1];
            console.log('stdout', stdout);
            console.log('stderr', stderr);
        });
    }
};

class MemoryPreferences extends Tp.Preferences {
    constructor() {
        super();
        this._prefs = {};
    }

    keys() {
        return Object.keys(this._prefs);
    }

    get(name) {
        return this._prefs[name];
    }

    set(name, value) {
        let changed = this._prefs[name] !== value;
        this._prefs[name] = value;
        if (changed)
            this.emit('changed', name);
        return value;
    }

    delete(name) {
        delete this._prefs[name];
        this.emit('changed', name);
    }

    changed(name = null) {
        this.emit('changed', name);
    }

    flush() {
        return Promise.resolve();
    }

    saveCopy(to) {
        return Promise.resolve();
    }
}

function safeMkdirSync(dir) {
    try {
        fs.mkdirSync(dir);
    } catch(e) {
        if (e.code !== 'EEXIST')
            throw e;
    }
}

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
        super(platform, THINGPEDIA_URL);
    }

    async _getLocalDeviceManifest(manifestPath, deviceKind) {
        const classDef = await super._getLocalDeviceManifest(manifestPath, deviceKind);

        // copy some metadata that is required by the tests and would be provided by Thingpedia
        if (!classDef.metadata.name)
            classDef.metadata.name = classDef.metadata.thingpedia_name;
        if (!classDef.metadata.description)
            classDef.metadata.description = classDef.metadata.thingpedia_description;

        return classDef;
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

class Platform extends Tp.BasePlatform {
    // Initialize the platform code
    // Will be called before instantiating the engine
    constructor() {
        super();
        this._gettext = new Gettext();

        this._filesDir = path.resolve('workdir');
        safeMkdirSync(this._filesDir);
        this._locale = 'en-US';

        this._gettext.setLocale(this._locale);
        this._timezone = 'America/Los_Angeles';
        this._prefs = new MemoryPreferences();
        this._cacheDir = 'workdir/cache';

        this._thingpedia = new ThingpediaClient(this);
        this._prefs = new MemoryPreferences();

        this._developerKey = getGitConfig('thingpedia.developer-key', process.env.THINGENGINE_DEVELOPER_KEY || undefined);
        this._prefs.set('developer-key', this._developerKey);
        safeMkdirSync(this._cacheDir);
        try {
            // wipe the database and start fresh
            fs.unlinkSync(this.getSqliteDB());
        } catch(e) {
            if (e.code !== 'ENOENT')
                throw e;
        }

        this._btApi = null;
    }

    getPlatformDevice() {
        return null;
    }

    get type() {
        return 'test';
    }

    get locale() {
        return this._locale;
    }

    get timezone() {
        return this._timezone;
    }

    hasCapability(cap) {
        switch (cap) {
        case 'code-download':
        case 'content-api':
        case 'thingpedia-client':
        case 'gettext':
            return true;
        default:
            return false;
        }
    }

    getCapability(cap) {
        switch(cap) {
        case 'code-download':
            return _unzipApi;
        case 'gettext':
            return this._gettext;
        case 'content-api':
            return _contentApi;
        case 'thingpedia-client':
            return this._thingpedia;

        default:
            return null;
        }
    }

    getSharedPreferences() {
        return this._prefs;
    }

    getWritableDir() {
        return this._filesDir;
    }

    getTmpDir() {
        return os.tmpdir();
    }

    getCacheDir() {
        return this._cacheDir;
    }

    getSqliteDB() {
        return this._filesDir + '/sqlite.db';
    }

    getSqliteKey() {
        return null;
    }

    getDeveloperKey() {
        return this._prefs.get('developer-key');
    }

    setDeveloperKey(key) {
        return this._prefs.set('developer-key', key);
    }

    getOrigin() {
        // pretend to be a local thingpedia server
        // oauth will be done out of band
        return 'http://127.0.0.1:8080';
    }

    getCloudId() {
        return this._prefs.get('cloud-id');
    }

    getAuthToken() {
        return this._prefs.get('auth-token');
    }

    setAuthToken(authToken) {
        var oldAuthToken = this._prefs.get('auth-token');
        if (oldAuthToken !== undefined && authToken !== oldAuthToken)
            return false;
        this._prefs.set('auth-token', authToken);
        return true;
    }

    loadContext(info) {
        if (info === "selection")
            return "Selected text";
        else
            return "Undefined context";
    }
}

module.exports = Platform;
