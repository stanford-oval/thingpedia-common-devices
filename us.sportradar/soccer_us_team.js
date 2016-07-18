// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//           2016 Riad S. Wahby <rsw@cs.stanford.edu> - modified from EU to US soccer support
//
// See LICENSE for details

const Tp = require('thingpedia');
const deepEqual = require('deep-equal');

const API_KEY = '66m6g836ezfad66s6g7edg79';
const SCHEDULE_URL = 'https://api.sportradar.us/soccer-t2/na/matches/schedule.xml?api_key=' + API_KEY;
const BOXSCORE_URL = 'https://api.sportradar.us/soccer-t2/na/matches/%s/boxscore.xml?api_key=' + API_KEY;
const POLL_INTERVAL = 24 * 3600 * 1000; // 1day

module.exports = new Tp.ChannelClass({
    Name: 'SportRadarNASoccerChannel',
    Extends: Tp.HttpPollingTrigger,
    interval: POLL_INTERVAL,

    _init: function(engine, device, params) {
        this.parent();

        this._params = params.slice(0, 1);
        this._observedTeam = params[0];
        if (!this._observedTeam)
            throw new TypeError("Missing required parameter");
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

    _emit: function(status, awayPoints, homePoints) {
        var currentEvent = [this._awayAlias, this._homeAlias, false,
                            this._awayName, this._homeName, status,
                            this._scheduledTime, awayPoints, homePoints];
        if (this._observedTeam === this._homeAlias) {
            currentEvent[0] = this._homeAlias;
            currentEvent[1] = this._awayAlias;
            currentEvent[2] = true;
        }

        if (deepEqual(this.event, currentEvent, { strict: true }))
            return;
        this.emitEvent(currentEvent);
    },

    _onNextGameEvent: function() {
        Tp.Helpers.Http.get(BOXSCORE_URL.format(this._gameId)).then(function(response) {
            return Tp.Helpers.Xml.parseString(response);
        }).then(function(parsed) {
            var match = parsed.boxscore.matches[0].match[0];
            var away = match.away[0];
            var home = match.home[0];
            var event = []
            this._emit(match.$.status, Number(away.$.score), Number(home.$.score));

            if (match.$.status !== 'closed') {
                this._nextGameTimer = setTimeout(this._onNextGameEvent.bind(this), 5 * 60000); // poll after 5 minutes
            } else {
                this._nextGameTimer = null;
                this._gameId = null;
            }
        }.bind(this)).catch(function(e) {
            console.error('Failed to process NA soccer game updates: ' + e.message);
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
                if (matches[i].home[0].$.alias === this._observedTeam ||
                    matches[i].away[0].$.alias === this._observedTeam) {
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
            this._awayAlias = match.away[0].$.alias;
            this._homeAlias = match.home[0].$.alias;
            this._awayName = match.away[0].$.name;
            this._homeName = match.home[0].$.name;

            var timeout;
            if (match.$.status === 'scheduled') {
                var scheduled = new Date(match.$.scheduled);
                this._scheduledTime = scheduled;
                var now = new Date();
                timeout = scheduled.getTime() - now.getTime() + 5000;
                if (timeout >= 5000)
                    this._emit('scheduled', 0, 0);
                else
                    timeout = 5000;
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
            console.error('Failed to process NA soccer game updates: ' + error.message);
            console.error(error.stack);
        });
    },
});
