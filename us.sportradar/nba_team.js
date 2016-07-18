// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

const NBA_API_KEY = 'w4meerq84mmrwksr8yz3xvms';
const NBA_SCHEDULE_URL = 'https://api.sportradar.us/nba-t3/games/%d/%d/%d/schedule.json?api_key=' + NBA_API_KEY;
const NBA_BOXSCORE_URL = 'https://api.sportradar.us/nba-t3/games/%s/boxscore.json?api_key=' + NBA_API_KEY;
const POLL_INTERVAL = 24 * 3600 * 1000; // 1day

module.exports = new Tp.ChannelClass({
    Name: 'SportRadarNbaChannel',
    Extends: Tp.HttpPollingTrigger,
    interval: POLL_INTERVAL,

    _init: function(engine, device, params) {
        this.parent();

        this._params = params.slice(0, 1);
        this._observedTeam = params[0];
        if (!this._observedTeam)
            throw new TypeError("Missing required parameter");

        this._updateUrl();
        this.filterString = this._params.join('-');

        this._gameId = null;
        this._nextGameTimer = null;

        this._lastStatus = null;
    },

    _doClose: function() {
        clearTimeout(this._nextGameTimer);
        this._nextGameTimer = null;
        return this.parent();
    },

    _updateUrl: function() {
        var now = new Date;
        this.url = NBA_SCHEDULE_URL.format(now.getFullYear(), now.getMonth() + 1, now.getDate());
        //console.log('url', this.url);
    },

    formatEvent(event) {
        var watchedAlias = event[0];
        var otherAlias = event[1];
        var watchedIsHome = event[2];
        var awayName = event[3];
        var homeName = event[4];
        var gameStatus = event[5];
        var scheduledTime = event[6];
        var awayPoints = event[7];
        var homePoints = event[8];

        switch(gameStatus) {
        case 'scheduled':
            return "Next game %s @ %s at %s".format(awayName, homeName, scheduledTime.toLocaleString());
        case 'inprogress':
            return "Game update for %s @ %s: %d - %d".format(awayName, homeName, awayPoints, homePoints);
        case 'halftime':
            return "Half-time for %s @ %s: %d - %d".format(awayName, homeName, awayPoints, homePoints);
        case 'closed':
            return "Final score for %s @ %s: %d - %d".format(awayName, homeName, awayPoints, homePoints);
        }
        return [];
    },

    _emit: function(status, awayPoints, homePoints) {
        var currentEvent = [this._awayAlias, this._homeAlias, false,
                            this._awayName, this._homeName, status,
                            this._scheduledTime, awayPoints, homePoints];
        if (this._observedTeam === this._homeAlias) {
            currentEvent[0] = this._homeAlias;
            currentEvent[1] = this._awayAlias;
            currentEvent[2] = true;
        }

        this.emitEvent(currentEvent);
    },

    _onNextGameEvent: function() {
        Tp.Helpers.Http.get(NBA_BOXSCORE_URL.format(this._gameId)).then(function(response) {
            var parsed = JSON.parse(response);

            if (parsed.status !== this._lastStatus) {
                this._lastStatus = parsed.status;
                this._emit(parsed.status, parsed.away.points, parsed.home.points);
            }

            if (parsed.status !== 'closed') {
                this._nextGameTimer = setTimeout(this._onNextGameEvent.bind(this), 5 * 60000); // poll after 5 minutes
            } else {
                this._nextGameTimer = null;
                this._gameId = null;
            }
        }.bind(this)).catch(function(e) {
            console.error('Failed to process NBA game updates: ' + e.message);
            console.error(e.stack);
        }).done();
    },

    _onTick: function() {
        this._updateUrl();
        return this.parent();
    },

    _onResponse: function(response) {
        if (!response)
            return;
        var parsed = JSON.parse(response);

        var games = parsed.games;
        var game = null;
        for (var i = 0; i < games.length; i++) {
            //console.log('Candidate game ' + games[i].away.alias + ' @ ' + games[i].home.alias);
            if (games[i].home.alias.toLowerCase() === this._observedTeam.toLowerCase() ||
                games[i].away.alias.toLowerCase() === this._observedTeam.toLowerCase()) {
                game = games[i];
                break;
            }
        }
        if (game === null) {
            //console.log('No game found for today');
            clearTimeout(this._nextGameTimer);
            this._nextGameTimer = null;
            this._gameId = null;
            return;
        }

        if (this._gameId === game.id) {
            // saw again a game we knew about
            return;
        }

        //console.log('Found game ' + game.id + ': ' + game.away.alias + ' @ ' + game.home.alias);
        this._lastStatus = null;
        this._gameId = game.id;
        this._awayAlias = game.away.alias.toLowerCase();
        this._homeAlias = game.home.alias.toLowerCase();
        this._awayName = game.away.name;
        this._homeName = game.home.name;

        var timeout;
        if (game.status === 'scheduled') {
            var scheduled = new Date(game.scheduled);
            this._scheduledTime = scheduled;
            var now = new Date();
            timeout = scheduled.getTime() - now.getTime() + 5000;
            if (timeout >= 5000)
                this._emit('scheduled', 0, 0);
            else
                timeout = 5000;
        } else {
            this._scheduledTime = new Date();
            timeout = 5000;
        }

        clearTimeout(this._nextGameTimer);
        this._nextGameTimer = setTimeout(this._onNextGameEvent.bind(this), timeout);
    },
});
