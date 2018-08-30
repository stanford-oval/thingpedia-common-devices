// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');
const deepEqual = require('deep-equal');

const API_KEY = '9kx5ta95brfyftwzx83vmfsz';
const SCHEDULE_URL = 'https://api.sportradar.us/soccer-t2/eu/matches/schedule.xml?api_key=' + API_KEY;
const BOXSCORE_URL = 'https://api.sportradar.us/soccer-t2/eu/matches/%s/boxscore.xml?api_key=' + API_KEY;
const POLL_INTERVAL = 24 * 3600 * 1000; // 1day

module.exports = new Tp.ChannelClass({
    Name: 'SportRadarEUSoccerChannel',
    Extends: Tp.HttpPollingTrigger,
    RequiredCapabilities: ['channel-state'],
    interval: POLL_INTERVAL,

    _init: function(engine, state, device, params) {
        this.parent(engine, state, device);
        this.state = state;

        this._params = params.slice(0, 1);
        this._observedTeam = params[0];
        if (!this._observedTeam)
            throw new TypeError("Missing required parameter");
        this.filterString = this._params.join('-');
        this.url = SCHEDULE_URL;

        this._gameId = null;
        this._nextGameTimer = null;
    },

    formatEvent(event) {
        var watchedAlias = event[0];
        var otherAlias = event[1];
        var watchedIsHome = event[2];
        var awayName = event[3];
        var homeName = event[4];
        var gameStatus = event[5];
        var scheduledTime = event[6];
        var awayScore = event[7];
        var homeScore = event[8];
        var result = event[9];

        var platform = this.engine.platform;
        switch(gameStatus) {
        case 'scheduled':
            return "Next game %s - %s at %s".format(homeName, awayName, scheduledTime.toLocaleString(platform.locale, { timeZone: platform.timezone }));
        case 'inprogress':
            return "Game update for %s - %s: %d - %d".format(homeName, awayName, homeScore, awayScore);
        case 'halftime':
            return "Half-time for %s - %s: %d - %d".format(homeName, awayName, homeScore, awayScore);
        case 'closed':
            return "Final score for %s - %s: %d - %d".format(homeName, awayName, homeScore, awayScore);
        }
        return [];
    },

    _doClose: function() {
        clearTimeout(this._nextGameTimer);
        this._nextGameTimer = null;
        return this.parent();
    },

    _emit: function(status, awayPoints, homePoints) {
        var currentEvent = [this._awayAlias, this._homeAlias, false,
                            this._awayName, this._homeName, status,
                            this._scheduledTime, awayPoints, homePoints,
                            'unclosed'];
        if (this._observedTeam.toLowerCase() === this._homeAlias) {
            currentEvent[0] = this._homeAlias;
            currentEvent[1] = this._awayAlias;
            currentEvent[2] = true;
        }
        if (status === 'closed') {
            if (awayPoints === homePoints) 
                currentEvent[9] = 'draw';
            if (this._observedTeam === this._homeAlias && homePoints > awayPoints)
                currentEvent[9] = 'win';
            else if (this._observedTeam === this._awayAlias && homePoints < awayPoints)
                currentEvent[9] = 'win';
            else
                currentEvent[9] = 'lose';
        }

        if (deepEqual(this.event, currentEvent, { strict: true }))
            return;
        this.emitEvent(currentEvent);
    },

    _onNextGameEvent: function() {
        Tp.Helpers.Http.get(BOXSCORE_URL.format(this._gameId)).then((response) => {
            return Tp.Helpers.Xml.parseString(response);
        }).then((parsed) => {
            var match = parsed.boxscore.matches[0].match[0];
            var away = match.away[0];
            var home = match.home[0];
            var event = [];
            this._emit(match.$.status, Number(away.$.score), Number(home.$.score));

            if (match.$.status !== 'closed') {
                this._nextGameTimer = setTimeout(this._onNextGameEvent.bind(this), 5 * 60000); // poll after 5 minutes
            } else {
                this._nextGameTimer = null;
                this._gameId = null;
            }
        }).catch((e) => {
            console.error('Failed to process EU soccer game updates: ' + e.message);
            console.error(e.stack);
        }).done();
    },

    _onResponse: function(response) {
        if (!response)
            return;
        Tp.Helpers.Xml.parseString(response).then((parsed) => {
            var matches = parsed.schedule.matches[0].match;
            var match = null;
            for (var i = 0; i < matches.length; i++) {
                if (matches[i].$.status === 'closed')
                    continue;
                //console.log('Candidate match ' + matches[i].home[0].$.alias + ' - ' + matches[i].away[0].$.alias);
                if (matches[i].home[0].$.alias.toLowerCase() === this._observedTeam.toLowerCase() ||
                    matches[i].away[0].$.alias.toLowerCase() === this._observedTeam.toLowerCase()) {
                    match = matches[i];
                    break;
                }
            }
            if (match === null) {
                console.log('No game found scheduled');
                clearTimeout(this._nextGameTimer);
                this._nextGameTimer = null;
                this._gameId = null;
                return;
            }

            if (this._gameId === match.$.id) {
                // saw again a game we knew about
                return;
            }

            console.log('Found match ' + match.$.id + ': ' + match.home[0].$.alias + ' - ' + match.away[0].$.alias);
            this._gameId = match.$.id;
            this._awayAlias = match.away[0].$.alias.toLowerCase();
            this._homeAlias = match.home[0].$.alias.toLowerCase();
            this._awayName = match.away[0].$.name;
            this._homeName = match.home[0].$.name;

            var timeout;
            if (match.$.status === 'scheduled') {
                var scheduled = new Date(match.$.scheduled);
                this._scheduledTime = scheduled;
                var now = new Date();
                timeout = scheduled.getTime() - now.getTime() + 5000;
                if (timeout >= 5000) {
                    var lastNotified = this.state.get('game-id');
                    if (lastNotified !== this._gameId) {
                        this.state.set('game-id', this._gameId);
                        this._emit('scheduled', 0, 0);
                    }
                } else {
                    timeout = 5000;
                }
                if (timeout > POLL_INTERVAL) {
                    clearTimeout(this._nextGameTimer);
                    return;
                }
            } else {
                this._scheduledTime = new Date();
                timeout = 5000;
            }

            clearTimeout(this._nextGameTimer);
            this._nextGameTimer = setTimeout(this._onNextGameEvent.bind(this), timeout);
        }).catch((error) => {
            console.error('Failed to process EU soccer game updates: ' + error.message);
            console.error(error.stack);
        });
    },
});
