// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Riad S. Wahby <rsw@cs.stanford.edu>
// based on us.sportradar device by Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const Q = require('q');
const Tp = require('thingpedia');

const API_KEY = 'qgzkq4q83c3uxxdz4mzhjw5p';
const SCHEDULE_URL = 'https://api.sportradar.us/ncaafb-t1/%d/REG/schedule.json?api_key=' + API_KEY;
const BOXSCORE_URL = 'https://api.sportradar.us/ncaafb-t1/%d/REG/%d/%s/boxscore.json?api_key=' + API_KEY;

module.exports = new Tp.ChannelClass({
    Name: 'SportRadarNCAAFBChannel',

    _init: function(engine, device, params) {
        this.parent();

        this._params = params.slice(0, 1);
        this._observedTeam = params[0];
        if (!this._observedTeam)
            throw new TypeError("Missing required parameter");
        this.filterString = this._params.join('-');

        this._lastStatus = null;
        this._scheduledTime = null;
        this._awayName = "";
        this._homeName = "";

        this._year = null;
        this._schedule = null;
        this._currentGame = null;
        this._weekNumbers = null;
        this._gameNumber = null;

        this._nextScheduleTimer = null;
        this._nextGameTimer = null;
    },

    _getSchedule: function() {
        var today = new Date();
        this._year = today.getFullYear();
        var URL = SCHEDULE_URL.format(this._year);

        // set timer to get new schedule
        // If this query fails, we'll wake up again in a week.
        this._setScheduleTimer(7 * 24 * 3600 * 1000);

        // download the year's schedule and parse it
        Tp.Helpers.Http.get(URL).then(function(response) {
            // query succeeded. Clear timer.
            this._clearTimeouts();

            var today = new Date();
            var parsed = JSON.parse(response);
            var weeks = parsed.weeks;

            var found_games = new Map();
            var found_weeks = new Array();

            // go through each week of the current season,
            // finding games of interest that haven't yet happened
            for (var i = 0; i < weeks.length; i++) {
                var found = null;
                var number = new Number(weeks[i].number);
                var games = weeks[i].games;
                for (var j = 0; j < games.length; j++) {
                    if (games[j].home === this._observedTeam || games[j].away === this._observedTeam ) {
                        if (games[j].status !== 'closed') {
                            found = games[j];
                        }
                        break;
                    }
                }

                if (found !== null) {
                    found_games.set(number, found);
                    found_weeks.push(number);
                }
            }

            // store away the relevant schedule information
            this._schedule = found_games;
            this._weekNumbers = found_weeks;
            this._gameNumber = 0;

            // set up timer for next game
            this._setupNextGame();
        }.bind(this)).catch(function(e) {
            console.error('Failed to get NCAAFB schedule: ' + e.message);
            console.error("This probably means that this season's schedule is not available yet. Sleeping one week.");
        }).done();
    },

    // figure out when the next game starts and set up callbacks
    _setupNextGame: function() {
        if (this._weekNumbers === null || this._schedule === null || this._gameNumber === null) {
            return;
        }

        var gameNumber = this._gameNumber;
        // we ran out of games for this year!
        // wait a week and try to get a new schedule
        if (gameNumber >= this._weekNumbers.length) {
            return this._setScheduleTimer(7 * 24 * 3600 * 1000);
        }

        // game details
        var week = this._weekNumbers[gameNumber];
        var game = this._schedule.get(week);
        this._currentGame = game;
        this._lastStatus = null;

        // kinda gross, but this struct doesn't tell me what the team names are, just abbrs
        this._awayName = "";
        this._homeName = "";

        // now schedule a timer to actually get game updates
        var scheduled = new Date(game.scheduled);
        this._scheduledTime = scheduled;
        var now = new Date();
        var timeout = scheduled.getTime() - now.getTime() + 5000;
        if (timeout < 5000) {
            timeout = 5000;
        } else {
            this._emit('scheduled', 0, 0);
        }

        this._setGameTimer(timeout);
    },

    // get game details for the upcoming game
    _nextGame: function() {
        var weekNumbers = this._weekNumbers;
        var gameNumber = this._gameNumber;
        var URL = BOXSCORE_URL.format(this._year, weekNumbers[gameNumber], this._currentGame.away + '/' + this._currentGame.home);

        Tp.Helpers.Http.get(URL).then(function(response) {
            var parsed = JSON.parse(response);

            // unpack team names from the game data
            this._awayName = parsed.away_team.market + ' ' + parsed.away_team.name;
            this._homeName = parsed.home_team.market + ' ' + parsed.home_team.name;

            if (parsed.status !== this._lastStatus) {
                this._lastStatus = parsed.status;
                this._emit(parsed.status, parsed.away_team.points, parsed.home_team.points);
            }

            if (parsed.status !== 'closed') {
                // grab another update in 5 minutes
                this._setGameTimer(5 * 60 * 1000);
            } else {
                // once this game is over, set up timeouts for the next one
                this._gameNumber++;
                this._setupNextGame();
            }
        }.bind(this)).catch(function(e) {
            console.error('Failed to process NCAAFB game update: ' + e.message);
            console.error(e.stack);
        }).done();
    },

    // emit a game update
    _emit: function(status, awayPoints, homePoints) {
        var currentEvent = [this._currentGame.away, this._currentGame.home, false,
                            this._awayName, this._homeName, status,
                            this._scheduledTime, awayPoints, homePoints];
        if (this._observedTeam === this._currentGame.home) {
            currentEvent[0] = currentEvent[1];
            currentEvent[1] = this._currentGame.away;
            currentEvent[2] = true;
        }

        this.emitEvent(currentEvent);
    },

    // set a timer to wake up and download the next schedule
    _setScheduleTimer: function(delay) {
        this._clearTimeouts();
        this._nextScheduleTimer = setTimeout(this._getSchedule.bind(this), delay);
    },

    // set a timer to wake up and get game details
    _setGameTimer: function(delay) {
        this._clearTimeouts();
        this._nextGameTimer = setTimeout(this._nextGame.bind(this), delay);
    },

    // close: just kill the timeouts
    _doClose: function() {
        this._clearTimeouts();
    },

    // open: kick off the schedule retrieval
    _doOpen: function() {
        return Q(this._getSchedule());
    },

    // clear all timeouts
    _clearTimeouts: function() {
        if (this._nextScheduleTimer !== null) {
            clearTimeout(this._nextScheduleTimer);
        }
        if (this._nextGameTimer !== null) {
            clearTimeout(this._nextGameTimer);
        }
    },
});
