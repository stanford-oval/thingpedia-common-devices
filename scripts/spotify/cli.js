#!/usr/bin/env node

"use strict";

const Repl = require("repl");

const { Command, Option } = require("commander");
const Winston = require("winston");
const { Value } = require("thingpedia");

const { Client } = require("../../main/com.spotify/dist/client");
const { Factory, Format } = require("@stanford-oval/logging");
const { isPagingObject } = require("../../main/com.spotify/dist/api/objects");

// Constants
// ===========================================================================

const CONSOLE_TRANSPORT = new Winston.transports.Console({
    format: Format.prettySimple({ colorize: true }),
});

const LOG_FACTORY = new Factory({
    runRoot: __dirname,
    level: "debug",
    transports: [CONSOLE_TRANSPORT],
    handleExceptions: true,
});

const LOG = LOG_FACTORY.get(__filename);

const DUMP_HIDE = new Set([
    "available_markets",
    "tracks",
    "images",
    "copyrights",
]);

// Class Definitions
// ===========================================================================

class MockOAuth2 {
    constructor(token) {
      this.token = token;
    }

    queryInterface(x) {
        if (x === "oauth2") {
            return {
                accessToken: this.token,
                refreshCredentials() {
                    return Promise.reject(
                        new Error(`refreshCredentials not implemented`)
                    );
                },
            };
        } else {
            throw new Error(`Unsupported interface: ${x}`);
        }
    }
}

class MockEnv {
    constructor(appId) {
        this.appId = appId;
        this.hook = null;
    }

    get app() {
        return { uniqueId: this.appId };
    }

    addExitProcedureHook(hook) {
        this.hook = hook;
    }
}

// Functions
// ===========================================================================

function hide(x) {
    const result = {};
    for (const [key, value] of Object.entries(x)) {
        if (DUMP_HIDE.has(key))
            result[key] = "(hidden)";
        else
            result[key] = value;
    }
    return result;
}

function dump(x, message = []) {
    if (isPagingObject(x)) {
        dump(x.items, [...message, `PagingObject`]);
    } else if (Array.isArray(x)) {
        x.forEach((item, index) =>
            dump(item, [...message, `Item ${index + 1}`])
        );
    } else {
        LOG.info(message.join(" -- "), hide(x));
    }
}

function repl(opts) {
    LOG.info("Starting REPL...", opts);
    const auth = new MockOAuth2(opts.token);
    const local = Repl.start("spotify-web-api> ");
    const client = new Client({useOAuth2: auth, userId: "nrser"});
    const env = new MockEnv("blah");

    local.context.auth = auth;
    local.context.client = client;
    local.context.env = env;
    local.context.log = LOG;
    local.context.dump = dump;
    local.context.store = (name) => {
        return (result) => {
            local.context[name] = result;
            LOG.info(`Stored result as ${name}`);
            return result;
        };
    };
    local.context.MockEnv = MockEnv;
    local.context.Entity = Value.Entity;
    local.context.enqueue = async () => {
        await client.do_play(
            {
                playable: new Value.Entity(
                    `spotify:album:64ub4SfdC8wvPjdUXw8QY9`,
                    "Return of the Boom-Bap"
                ),
            },
            env
        );

        await client.do_play(
            {
                playable: new Value.Entity(
                    `spotify:playlist:6VcefzRVz4hQityRgYVeMz`,
                    "kel"
                ),
            },
            env
        );

        await env.hook();
    };
}

function createProgram() {
    const program = new Command();

    program
        .option("-d, --debug", "Enable debug logging")
        .addOption(
            new Option("-t, --token", "Spotify Web API Access Token")
                .env("SPOTIFY_TOKEN")
                .default("", "Empty access token")
        );

    program
        .command("repl")
        .description("Start a Node REPL session with client in context")
        .addOption(
            new Option("-t, --token <token>", "Spotify Web API Access Token")
                .env("SPOTIFY_TOKEN")
                .default("", "Empty access token")
        )
        .action((options) => repl(options));

    return program;
}

function main() {
    createProgram().parse(process.argv);
}

// Execution Hook
// ===========================================================================

if (require.main === module)
    main();
