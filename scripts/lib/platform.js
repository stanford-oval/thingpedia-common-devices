// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
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

const Tp = require('thingpedia');
const os = require('os');

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

class MockPlatform extends Tp.BasePlatform {
    constructor() {
        super();
        this._prefs = new MemoryPreferences();
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

    getSharedPreferences() {
        return this._prefs;
    }

    getWritableDir() {
        return os.homedir() + './.config/genie-toolkit';
    }

    getTmpDir() {
        return os.tmpdir();
    }

    getCacheDir() {
        return './workdir/cache';
    }

    getSqliteDB() {
        return './workdir/sqlite.db';
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
}
module.exports = MockPlatform;
