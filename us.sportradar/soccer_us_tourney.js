// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//           2016 Riad S. Wahby <rsw@cs.stanford.edu> - modified to select based on tournament rather than team
//
// See LICENSE for details

const Tp = require('thingpedia');
const deepEqual = require('deep-equal');

const API_KEY = '66m6g836ezfad66s6g7edg79';
const SCHEDULE_URL = 'https://api.sportradar.us/soccer-t2/na/matches/schedule.xml?api_key=' + API_KEY;
const BOXSCORE_URL = 'https://api.sportradar.us/soccer-t2/na/matches/%s/boxscore.xml?api_key=' + API_KEY;
const POLL_INTERVAL = 24 * 3600 * 1000; // 1day

module.exports = new Tp.ChannelClass({
    Name: 'SportRadarNATourneySoccerChannel',
    Extends: Tp.HttpPollingTrigger,
    RequiredCapabilities: ['channel-state'],
    interval: POLL_INTERVAL,

    _init: function(engine, state, device, params) {
        this.parent(engine, state, device);
        this.state = state;

        this._params = params.slice(0, 1);
        this._observedTourney = params[0];
        if (!this._observedTourney)
            throw new TypeError("Missing required parameter");
        this._observedTourneyLC = this._params[0].toLowerCase();
        this.filterString = this._params.join('-');
        this.url = SCHEDULE_URL;

        this._gameId = null;
        this._nextGameTimer = null;
    },

    _doClose: function() {
        clearTimeout(this._nextGameTimer);
        this._nextGameTimer = null;
        return this.parent();
    },

    formatEvent(event) {
        var observedTournament = event[0];
        var tournamentName = event[1];
        var tournamentGroup = event[2];
        var awayAlias = event[3];
        var homeAlias = event[4];
        var awayName = event[5];
        var homeName = event[6];
        var gameStatus = event[7];
        var scheduledTime = event[8];
        var awayScore = event[7];
        var homeScore = event[8];

        var platform = this.engine.platform;
        switch(gameStatus) {
        case 'scheduled':
            return "Next game in %s (%s) %s - %s at %s".format(tournamentName, tournamentGroup, homeName, awayName, scheduledTime.toLocaleString(platform.locale, { timeZone: platform.timezone }));
        case 'inprogress':
            return "Game update for %s - %s: %d - %d".format(homeName, awayName, homeScore, awayScore);
        case 'halftime':
            return "Half-time for %s - %s: %d - %d".format(homeName, awayName, homeScore, awayScore);
        case 'closed':
            return "Final score for %s - %s: %d - %d".format(homeName, awayName, homeScore, awayScore);
        }
        return [];
    },

    _emit: function(status, awayPoints, homePoints) {
        var currentEvent = [this._observedTourney, this._tourneyName, this._tourneyGroup,
                            this._awayAlias, this._homeAlias,
                            this._awayName, this._homeName, status,
                            this._scheduledTime, awayPoints, homePoints];

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
            console.error('Failed to process NA tourney soccer game updates: ' + e.message);
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
                if (matches[i].tournament_group[0].$.name.toLowerCase().indexOf(this._observedTourneyLC) !== -1 ||
                    matches[i].tournament[0].$.name.toLowerCase().indexOf(this._observedTourneyLC) !== -1) {
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
            this._tourneyName = match.tournament[0].$.name;
            this._tourneyGroup = match.tournament_group[0].$.name;
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
            } else {
                this._scheduledTime = new Date();
                timeout = 5000;
            }

            clearTimeout(this._nextGameTimer);
            this._nextGameTimer = setTimeout(this._onNextGameEvent.bind(this), timeout);
        }).catch((error) => {
            console.error('Failed to process NA tourney soccer game updates: ' + error.message);
            console.error(error.stack);
        });
    },
});
