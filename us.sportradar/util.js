// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2018 Google LLC
//
// See LICENSE for details
"use strict";

const Stream = require('stream');

const DEFAULT_SCHEDULE_POLL_INTERVAL = 24 * 3600 * 1000; // 1day
const DEFAULT_GAME_POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes

function delay(ms) {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, ms);
    });
}

function makeGetAndSubscribe(getNextGame, getGameDetails, formatGame, options = {}) {
    if (!options.schedulePollInterval)
        options.schedulePollInterval = DEFAULT_SCHEDULE_POLL_INTERVAL;
    if (!options.gamePollInterval)
        options.gamePollInterval = DEFAULT_GAME_POLL_INTERVAL;

    async function get(apiKey, team) {
        if (!apiKey)
            apiKey = options.defaultApiKey;

        const game = await getNextGame(apiKey, String(team));
        if (game === null)
            return [];

        const gameStatus = game.status || game.$.status;
        if (gameStatus === 'scheduled')
            return [formatGame(team, game, null)];

        // wait 1 second so we don't hit "Developer Over Qps" error
        await delay(1000);
        const gameDetails = await getGameDetails(apiKey, game, String(team));
        return [formatGame(team, game, gameDetails)];
    }

    class SportradarStream extends Stream.Readable {
        constructor(apiKey, team, state) {
            super({ objectMode: true });
            this._timeout = null;
            this.state = state;
            this.apiKey = apiKey;
            this.team = team;
            this._teamId = String(team);

            this._destroyed = false;
            this._scheduleTimeout = null;
            this._nextGameTimeout = null;
        }

        destroy() {
            if (this._scheduleTimeout !== null) {
                clearInterval(this._scheduleTimeout);
                this._scheduleTimeout = null;
            }
            if (this._nextGameTimeout !== null) {
                clearTimeout(this._nextGameTimeout);
                this._nextGameTimeout = null;
            }
            this._destroyed = true;
        }

        _onScheduleTick(now) {
            Promise.resolve().then(async () => {
                const game = await getNextGame(this.apiKey, this._teamId);
                if (game === null)
                    return;

                if (game.$.id === this.state.get('last-game')) {
                    // we already know about this game
                    return;
                }

                this.state.set('last-game', game.$.id);
                this._startWatchingGame(game);
            }).catch((e) => this.emit('error', e));
        }

        _emit(game, gameDetails) {
            this.push(formatGame(this.team, game, gameDetails));
        }

        _onNextGameEvent(game) {
            Promise.resolve().then(async () => {
                const gameDetails = await getGameDetails(this.apiKey, game, this._teamId);
                this._emit(game, gameDetails);

                if (gameDetails.status === 'closed') {
                    clearTimeout(this._nextGameTimeout);
                    this._nextGameTimeout = null;
                } else {
                    const timeout = options.gamePollInterval;
                    this._nextGameTimeout = setTimeout(() => this._onNextGameEvent(game), timeout);
                }
            }).catch((e) => this.emit('error', e));
        }

        _startWatchingGame(game) {
            let timeout = 0;
            const gameStatus = game.status || game.$.status;
            if (gameStatus === 'scheduled') {
                const scheduled = new Date(game.scheduled || game.$.scheduled);
                const now = new Date();
                timeout = scheduled.getTime() - now.getTime() + 5000;
            }
            if (timeout >= 1000)
                this._emit(game, null);
            else
                timeout = 1000;

            clearTimeout(this._nextGameTimeout);
            this._nextGameTimeout = setTimeout(() => this._onNextGameEvent(game), timeout);
        }

        _read() {
            if (this._scheduleTimeout === null) {
                this._scheduleTimeout = setInterval(this._onScheduleTick.bind(this),
                                                    options.schedulePollInterval);
            }
        }
    }

    function subscribe(apiKey, team, state) {
        return new SportradarStream(apiKey, team, state);
    }

    return { get, subscribe };
}

module.exports = { delay, makeGetAndSubscribe };
