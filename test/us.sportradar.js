// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Silei Xu <silei@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const assert = require('assert');
const Tp = require('thingpedia');

module.exports = [
    ['query', 'nba_games', { date: new Date(2018, 12, 19) }, (results) => {
        for (let result of results) {
            assert.strictEqual(typeof result.home_team.display,
                'string');
            assert.strictEqual(typeof result.home_score, 'number');
            assert.strictEqual(typeof result.away_team.display,
                'string');
            assert.strictEqual(typeof result.away_score, 'number');
            assert.strictEqual(result.status, 'closed');
        }
    }],

    ['query', 'mlb_games', { date: new Date(2019, 7, 26) }, (results) => {
        for (let result of results) {
            assert.strictEqual(typeof result.home_team.display,
                'string');
            assert.strictEqual(typeof result.home_score, 'number');
            assert.strictEqual(typeof result.away_team.display,
                'string');
            assert.strictEqual(typeof result.away_score, 'number');
            assert.strictEqual(result.status, 'closed');
        }
    }],

    ['query', 'nhl_games', { date: new Date(2018, 12, 19) }, (results) => {
        for (let result of results) {
            assert.strictEqual(typeof result.home_team.display,
                'string');
            assert.strictEqual(typeof result.home_score, 'number');
            assert.strictEqual(typeof result.away_team.display,
                'string');
            assert.strictEqual(typeof result.away_score, 'number');
            assert.strictEqual(result.status, 'closed');
        }
    }],

    ['query', 'nba_roster', { team: new Tp.Value.Entity('hou') }, (
        results) => {
        for (let result of results) {
            assert(['SG', 'SF', 'PG', 'PF', 'C', 'Head Coach'].includes(result.position));
            assert.strictEqual(typeof result.member, 'string');
        }
    }],

    ['query', 'mlb_roster', { team: new Tp.Value.Entity('oak') }, (
        results) => {
        for (let result of results) {
            assert(['1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'C', 'DH',
                'SP1', 'SP2', 'SP3', 'SP4', 'SP5', 'CL'
            ].includes(result.position));
            assert.strictEqual(typeof result.member, 'string');
        }
    }],

    ['query', 'nhl_roster', { team: new Tp.Value.Entity('sj') }, (
        results) => {
        for (let result of results) {
            assert(['G', 'C', 'D', 'RW', 'LW', 'Head Coach'].includes(result.position));
            assert.strictEqual(typeof result.member, 'string');
        }
    }],

    ['query', 'nba_boxscore', { date: new Date(2018, 12, 19) }, (
        results) => {
        for (let result of results) {
            assert.strictEqual(typeof result.home_team.display,
                'string');
            assert.strictEqual(typeof result.home_score, 'number');
            assert.strictEqual(typeof result.away_team.display,
                'string');
            assert.strictEqual(typeof result.away_score, 'number');
            assert.strictEqual(typeof result.home_quarter1, 'number');
            assert.strictEqual(typeof result.away_quarter1, 'number');

            assert.strictEqual(typeof result.home_leading_scorer,
                'string');
            assert.strictEqual(typeof result.away_leading_scorer,
                'string');
        }
    }],

    ['query', 'mlb_boxscore', { date: new Date(2019, 7, 26) }, (
        results) => {
        for (let result of results) {
            assert.strictEqual(typeof result.home_team.display,
                'string');
            assert.strictEqual(typeof result.home_score, 'number');
            assert.strictEqual(typeof result.away_team.display,
                'string');
            assert.strictEqual(typeof result.away_score, 'number');
            assert.strictEqual(typeof result.home_inning1, 'number');
            assert.strictEqual(typeof result.away_inning1, 'number');

            assert.strictEqual(typeof result.home_starting_pitcher,
                'string');
            assert.strictEqual(typeof result.away_starting_pitcher,
                'string');
        }
    }],

    ['query', 'nhl_boxscore', { date: new Date(2018, 12, 19) }, (
        results) => {
        for (let result of results) {
            assert.strictEqual(typeof result.home_team.display,
                'string');
            assert.strictEqual(typeof result.home_score, 'number');
            assert.strictEqual(typeof result.away_team.display,
                'string');
            assert.strictEqual(typeof result.away_score, 'number');
            assert.strictEqual(typeof result.home_quarter1, 'number');
            assert.strictEqual(typeof result.away_quarter1, 'number');

            assert.strictEqual(typeof result.home_leading_scorer,
                'string');
            assert.strictEqual(typeof result.away_leading_scorer,
                'string');
        }
    }],

    ['query', 'nba_team_ranking', {
        team: new Tp.Value.Entity('gsw',
            'Golden State Warriors'),
        year: 2012
    }, (results) => {
        for (let result of results) {
            assert.strictEqual(typeof result.divisionPos, 'number');
            assert.strictEqual(typeof result.divisionName, 'string');
            assert.strictEqual(typeof result.conferencePos, 'number');
            assert.strictEqual(typeof result.conferenceName, 'string');
        }
    }],

    ['query', 'mlb_team_ranking', {
        team: new Tp.Value.Entity('oak',
            'Oakland Athletics'),
        year: 2012
    }, (results) => {
        for (let result of results) {
            assert.strictEqual(typeof result.divisionPos, 'number');
            assert.strictEqual(typeof result.divisionName, 'string');
            assert.strictEqual(typeof result.leaguePos, 'number');
            assert.strictEqual(typeof result.leagueName, 'string');
        }
    }],

    ['query', 'nhl_team_ranking', {
        team: new Tp.Value.Entity('sj',
            'San Jose Sharks'),
        year: 2012
    }, (results) => {
        for (let result of results) {
            assert.strictEqual(typeof result.divisionPos, 'number');
            assert.strictEqual(typeof result.divisionName, 'string');
            assert.strictEqual(typeof result.conferencePos, 'number');
            assert.strictEqual(typeof result.conferenceName, 'string');
        }
    }],
];