// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2020 The Board of Trustees of the Leland Stanford Junior University
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

// Scenario tests: as end-to-end as it gets

process.on('unhandledRejection', (up) => { throw up; });

const util = require('util');
const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const byline = require('byline');
const seedrandom = require('seedrandom');
const argparse = require('argparse');
const Genie = require('genie-toolkit');

const StreamUtils = require('../../scripts/lib/stream_utils');
const { initializeCredentials } = require('../lib/cred-utils');
const Platform = require('../lib/platform');

let _anyFailed = false;

class RestartableRandomNumberGenerator {
    constructor() {
        this.reset();
    }

    reset() {
        this._real = seedrandom.alea('almond is awesome');
    }

    _next() {
        return this._real();
    }

    makeRNG() {
        return this._next.bind(this);
    }
}

class TestRunner {
    constructor() {
        this.anyFailed = false;
        this._buffer = '';
        this.rng = new RestartableRandomNumberGenerator;
    }

    get buffer() {
        return this._buffer;
    }

    reset() {
        this.rng.reset();
        this.nextTurn();
    }

    nextTurn() {
        this._buffer = '';
    }

    writeLine(line) {
        this._buffer += line + '\n';
    }
}

class TestDelegate {
    constructor(testRunner) {
        this._testRunner = testRunner;
    }

    setHypothesis(hypothesis) {
        // do nothing
    }
    setExpected(expect, context) {
        this._testRunner.writeLine('>> expecting = ' + expect);
    }

    addMessage(msg) {
        switch (msg.type) {
        case 'text':
        case 'result':
            this._testRunner.writeLine(msg.text);
            break;

        case 'picture':
            this._testRunner.writeLine('picture: ' + msg.url);
            break;

        case 'rdl':
            this._testRunner.writeLine('rdl: ' + msg.rdl.displayTitle + ' ' + (msg.rdl.callback || msg.rdl.webCallback));
            break;

        case 'choice':
            this._testRunner.writeLine('choice ' + msg.idx + ': ' + msg.title);
            break;

        case 'link':
            this._testRunner.writeLine('link: ' + msg.title + ' ' + msg.url);
            break;

        case 'button':
            this._testRunner.writeLine('button: ' + msg.title + ' ' + JSON.stringify(msg.json));
            break;
        }
    }
}

async function collectScenarioFiles(argv) {
    let files = new Set();

    for (let arg of argv) {
        if (arg.indexOf('/') >= 0) {
            files.add(path.resolve(arg, 'eval/scenarios.txt'));
        } else {
            // multi-device scenarios
            files.add(path.resolve('eval', arg, 'scenarios.txt'));

            // single-device scenarios
            for (let kind of await util.promisify(fs.readdir)(arg)) {
                if (!await existsSafe(arg + '/' + kind + '/manifest.tt'))
                    continue;
                if (!await existsSafe(arg + '/' + kind + '/eval/scenarios.txt'))
                    continue;
                files.add(path.resolve(arg, kind, 'eval/scenarios.txt'));
            }
        }
    }

    return Array.from(files);
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

async function roundtrip(testRunner, input, expected) {
    testRunner.nextTurn();

    const conversation = testRunner.conversation;
    if (input.startsWith('\\r {'))
        await conversation.handleParsedCommand(JSON.parse(input.substring(2)));
    else if (input.startsWith('\\r'))
        await conversation.handleParsedCommand({ code: input.substring(2).trim().split(' '), entities: {} });
    else if (input.startsWith('\\t'))
        await conversation.handleThingTalk(input.substring(2));
    else
        await conversation.handleCommand(input);

    const output = testRunner.buffer;
    const regexp = new RegExp(expected.trim());
    if (!regexp.test(output)) {
        console.error('Invalid reply: ' + testRunner.buffer.trim());
        console.error('\nExpected: ', regexp);
        _anyFailed = true;
        if (testRunner.stopOnError)
            process.exit(1);
        return false;
    }
    return true;
}

function parseScenarioID(dlgId) {
    let [, id, reqs] = /^(.*?)\s*(?:\(\s*req\s*=\s*([a-z0-9.-]+(?:,[a-z0-9.-]+)*)\s*\)\s*)?$/.exec(dlgId);
    if (reqs)
        reqs = reqs.split(',');
    else
        reqs = [];

    return [id, reqs];
}

async function test(testRunner, dlg, i) {
    const [id, reqs] = parseScenarioID(dlg.id);
    if (testRunner.ids && !testRunner.ids.has(id))
        return;

    console.log(`Scenario #${i+1}: ${id}`);

    testRunner.reset();

    // reset the conversation
    if (i > 0)
        await roundtrip(testRunner, '\\r bookkeeping special special:stop', '');

    for (let req of reqs) {
        if (testRunner.engine.devices.getAllDevicesOfKind(req).length === 0) {
            console.log(`SKIPPED (missing credentials for ${req})`);
            return;
        }
    }

    for (let turn of dlg) {
        if (!await roundtrip(testRunner, turn.user, turn.agent))
            return;
    }
}

function readAllLines(files, separator = '') {
    return StreamUtils.chain(files.map((f) => fs.createReadStream(f).setEncoding('utf8').pipe(byline())), { objectMode: true, separator });
}

async function execProcess(command, ...args) {
    const child = child_process.spawn(command, args, { stdio: ['ignore', 'inherit', 'inherit'] });

    return new Promise((resolve, reject) => {
        child.on('error', reject);
        child.on('exit', (code, signal) => {
            if (signal) {
                if (signal === 'SIGINT' || signal === 'SIGTERM')
                    reject(new Error(`Killed`));
                else
                    reject(new Error(`Command crashed with signal ${signal}`));
            } else {
                if (code !== 0)
                    reject(new Error(`Command exited with code ${code}`));
                else
                    resolve();
            }
        });
    });
}

async function sleep(timeout) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, timeout);
    });
}

async function initializeEngine(platform, engine) {
    await engine.open();

    await Promise.all([
        // initialize the credentials from the test directory
       initializeCredentials(engine),

       (async () => {
           // if cloud sync is set up, we'll download the credentials of the devices to
           // test from almond-dev
           // sleep for 30 seconds while that happens
           if (platform.getCloudId()) {
               console.log('Waiting for cloud sync to complete...');
               await sleep(30000);
           }
       })()
   ]);
}

async function main() {
    const parser = new argparse.ArgumentParser({
        add_help: true,
        description: "Scenario testing script."
    });
    parser.add_argument('-r', '--release', {
        help: 'Release to work against',
        choices: ['builtin', 'main', 'universe', 'staging'],
        default: 'universe',
    });
    parser.add_argument('--nlu-model', {
        required: false,
        help: 'NLU model'
    });
    parser.add_argument('--manual', {
        action: 'store_true',
        help: 'Run scenarios in manual mode (might trigger side-effects, and run additional scenarios)'
    });
    parser.add_argument('--stop-on-error', {
        action: 'store_true',
        help: 'Stop on the first error'
    });
    parser.add_argument('--ids', {
        nargs: '+',
        required: false,
        help: 'Only run scenarios with these IDs'
    });
    parser.add_argument('scenarios', {
        nargs: '+',
        help: 'Scenarios to test. This can be a release name or a release slash device name.'
    });
    const args = parser.parse_args();

    // set TEST_MODE if we're called without --manual
    if (!args.manual)
        process.env.TEST_MODE = '1';

    const testRunner = new TestRunner();
    testRunner.stopOnError = args.stop_on_error;
    const rng = testRunner.rng.makeRNG();

    // takes either (1) device names to test, or (2) release channel to test
    const files = await collectScenarioFiles(args.scenarios);
    for (let file of files)
        console.log('Loading scenario file ' + file + ' ...');
    let scenarios = await readAllLines(files, '====')
        .pipe(new Genie.DialogueParser({ withAnnotations: false, invertTurns: true }))
        .pipe(new StreamUtils.ArrayAccumulator())
        .read();

    if (args.ids && args.ids.length)
        testRunner.ids = new Set(args.ids);

    if (args.nlu_model) {
        await execProcess('make', 'release=' + args.release,
            'eval/' + args.release + '/models/' + args.nlu_model + '/best.pth');
    }

    const platform = new Platform(args.release);

    let nluModelUrl;
    if (args.nlu_model)
        nluModelUrl = 'file://' + path.resolve('eval/' + args.release + '/models/' + args.nlu_model);
    else
        nluModelUrl = 'https://nlp-staging.almond.stanford.edu';
    const engine = new Genie.AssistantEngine(platform, {
        nluModelUrl,
        cloudSyncUrl: 'https://dev.almond.stanford.edu'
    });
    testRunner.engine = engine;

    await initializeEngine(platform, engine);

    try {

        const conversation = await engine.assistant.getOrOpenConversation('test', {
            debug: true,
            testMode: false,
            showWelcome: false,
            anonymous: false,
            rng: rng,
        });
        testRunner.conversation = conversation;
        const delegate = new TestDelegate(testRunner);
        await conversation.addOutput(delegate);

        for (let i = 0; i < scenarios.length; i++)
            await test(testRunner, scenarios[i], i);

    } finally {
        await engine.close();
    }

    if (_anyFailed) {
        console.log('Some tests failed');
        process.exit(1);
    } else {
        process.exit(0);
    }
}
main();
