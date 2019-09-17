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

    ['query', 'nfl_games', { week: 10, year: 2018 }, (results) => {
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

    ['query', 'ncaamb_games', { date: new Date(2018, 12, 19) }, (results) => {
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

    ['query', 'ncaafb_games', { week: 1, year: 2019 }, (results) => {
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

    ['query', 'eu_soccer_games', {
        league: new Tp.Value.Entity(
            'sr:tournament:17'),
        date: new Date(2018, 12, 19)
    }, (results) => {
        for (let result of results) {
            assert.strictEqual(typeof result.home_team.display,
                'string');
            assert.strictEqual(typeof result.away_team.display,
                'string');
            assert.strictEqual(result.status, 'closed');
        }
    }],

    ['query', 'am_soccer_games', {
        league: new Tp.Value.Entity(
            'sr:tournament:242'),
        date: new Date(2018, 12, 19)
    }, (results) => {
        for (let result of results) {
            assert.strictEqual(typeof result.home_team.display,
                'string');
            assert.strictEqual(typeof result.away_team.display,
                'string');
            assert.strictEqual(result.status, 'closed');
        }
    }],

    ['query', 'nba_roster', { team: new Tp.Value.Entity('hou') }, (
        results) => {
        for (let result of results) {
            assert(['SG', 'SF', 'PG', 'PF', 'C', 'Head Coach'].includes(
                result.position));
            assert.strictEqual(typeof result.member, 'string');
        }
    }],

    ['query', 'mlb_roster', { team: new Tp.Value.Entity('oak') }, (
        results) => {
        for (let result of results) {

            try {
                assert(['1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'C', 'DH', 'SP1', 'SP2',
                    'SP3', 'SP4', 'SP5', 'CL'
                ].includes(result.position));
            } catch (error) {
                //5 Starting Pitchers is standard, however there is
                //no limit on the number of Starting Pitchers a team can have
                assert(result.position.includes('SP'));
            }

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

    ['query', 'nfl_roster', { team: new Tp.Value.Entity('la') }, (
        results) => {
        for (let result of results) {
            assert(['TE', 'RB', 'DB', 'OLB', 'CB', 'T', 'C', 'NT', 'FS', 'WR',
                'QB', 'LS', 'P', 'ILB', 'DT', 'LB', 'G', 'SS', 'K', 'DE',
                'Head Coach'
            ].includes(result.position));
            assert.strictEqual(typeof result.member, 'string');
        }
    }],

    ['query', 'ncaamb_roster', { team: new Tp.Value.Entity('duke') }, (
        results) => {
        for (let result of results) {
            assert(['G', 'F', 'C', 'Head Coach'].includes(
                result.position));
            assert.strictEqual(typeof result.member, 'string');
        }
    }],

    ['query', 'ncaafb_roster', { team: new Tp.Value.Entity('bama') }, (
        results) => {
        for (let result of results) {
            assert(['RB', 'LB', 'OL', 'DL', 'DB', 'QB', 'TE', 'WR', 'LS', 'P',
                'K', 'K/P', 'Head Coach'
            ].includes(result.position));
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
            assert.strictEqual(typeof result.home_period1, 'number');
            assert.strictEqual(typeof result.away_period1, 'number');

            assert.strictEqual(typeof result.home_leading_scorer,
                'string');
            assert.strictEqual(typeof result.away_leading_scorer,
                'string');
        }
    }],

    ['query', 'nfl_boxscore', { week: 10, year: 2018 }, (
        results) => {
        for (let result of results) {
            assert.strictEqual(typeof result.home_team.display,
                'string');
            assert.strictEqual(typeof result.home_score, 'number');
            assert.strictEqual(typeof result.away_team.display,
                'string');
            assert.strictEqual(typeof result.away_score, 'number');
            assert.strictEqual(typeof result.home_half1, 'number');
            assert.strictEqual(typeof result.away_half1, 'number');

        }
    }],

    ['query', 'ncaamb_boxscore', { date: new Date(2018, 12, 19) }, (
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

    ['query', 'ncaafb_boxscore', { week: 2, year: 2018 }, (
        results) => {
        for (let result of results) {
            assert.strictEqual(typeof result.home_team.display,
                'string');
            assert.strictEqual(typeof result.home_score, 'number');
            assert.strictEqual(typeof result.away_team.display,
                'string');
            assert.strictEqual(typeof result.away_score, 'number');
            assert.strictEqual(typeof result.home_half1, 'number');
            assert.strictEqual(typeof result.away_half1, 'number');

        }
    }],

    ['query', 'eu_soccer_boxscore', {
        league: new Tp.Value.Entity(
            'sr:tournament:17'),
        date: new Date(2018, 12, 19)
    }, (
        results) => {
        for (let result of results) {
            assert.strictEqual(typeof result.home_team.display,
                'string');
            assert.strictEqual(typeof result.home_score, 'number');
            assert.strictEqual(typeof result.away_team.display,
                'string');
            assert.strictEqual(typeof result.away_score, 'number');
            assert.strictEqual(typeof result.home_half1, 'number');
            assert.strictEqual(typeof result.away_half1, 'number');
            assert.strictEqual(typeof result.match_status, 'The game has ended');

        }
    }],

    ['query', 'am_soccer_boxscore', {
        league: new Tp.Value.Entity(
            'sr:tournament:242'),
        date: new Date(2018, 12, 19)
    }, (
        results) => {
        for (let result of results) {
            assert.strictEqual(typeof result.home_team.display,
                'string');
            assert.strictEqual(typeof result.home_score, 'number');
            assert.strictEqual(typeof result.away_team.display,
                'string');
            assert.strictEqual(typeof result.away_score, 'number');
            assert.strictEqual(typeof result.home_half1, 'number');
            assert.strictEqual(typeof result.away_half1, 'number');
            assert.strictEqual(typeof result.match_status, 'The game has ended');

        }
    }],

    ['query', 'nba_team_ranking', {
        team: new Tp.Value.Entity('gsw',
            'Golden State Warriors'),
        year: 2015
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
        year: 2017
    }, (results) => {
        for (let result of results) {
            assert.strictEqual(typeof result.divisionPos, 'number');
            assert.strictEqual(typeof result.divisionName, 'string');
            assert.strictEqual(typeof result.conferencePos, 'number');
            assert.strictEqual(typeof result.conferenceName, 'string');
        }
    }],

    ['query', 'nfl_team_ranking', {
        team: new Tp.Value.Entity('oak',
            'Oakland Raiders'),
        year: 2015
    }, (results) => {
        for (let result of results) {
            assert.strictEqual(typeof result.divisionPos, 'number');
            assert.strictEqual(typeof result.divisionName, 'string');
            assert.strictEqual(typeof result.conferencePos, 'number');
            assert.strictEqual(typeof result.conferenceName, 'string');
        }
    }],

    ['query', 'ncaamb_team_ranking', {
        team: new Tp.Value.Entity('unc',
            'University of North Carolina'),
        year: 2017
    }, (results) => {
        for (let result of results) {
            assert.strictEqual(typeof result.conferenceName, 'string');
            assert.strictEqual(typeof result.wins, 'number');
            assert.strictEqual(typeof result.losses, 'number');
            assert.strictEqual(typeof result.gamesBehind, 'number');
        }
    }],

    ['query', 'ncaafb_team_ranking', {
        team: new Tp.Value.Entity('bama',
            'University of Alabama'),
        year: 2012
    }, (results) => {
        for (let result of results) {
            assert.strictEqual(typeof result.conferenceName, 'string');
            assert.strictEqual(typeof result.wins, 'number');
            assert.strictEqual(typeof result.losses, 'number');
        }
    }],

    ['query', 'eu_soccer_league_rankings', {
        league: new Tp.Value.Entity('sr:tournament:17')
    }, (results) => {
        for (let result of results) {
            assert.strictEqual(typeof result.team.display, 'string');
            assert.strictEqual(typeof result.teamRank, 'number');
            assert.strictEqual(typeof result.groupName, 'string');
        }
    }],

    ['query', 'am_soccer_league_rankings', {
        league: new Tp.Value.Entity('sr:tournament:242')
    }, (results) => {
        for (let result of results) {
            assert.strictEqual(typeof result.team.display, 'string');
            assert.strictEqual(typeof result.teamRank, 'number');
            assert.strictEqual(typeof result.groupName, 'string');
        }
    }],


];