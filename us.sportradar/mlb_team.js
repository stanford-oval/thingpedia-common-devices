// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
// vim: syntax=javascript
//
// Copyright 2016 Riad S. Wahby <rsw@cs.stanford.edu>
// based on us.sportradar device by Giovannni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');
const { makeGetAndSubscribe } = require('./util');

const API_KEY = 'tn5sx574v9yk995cc29ccftz';

async function getNextGame(apiKey, team) {
    const now = new Date;
    const scheduleUrl = `https://api.sportradar.us/mlb-t5/games/${now.getFullYear()}/${now.getMonth()+1}/${now.getDate()}/schedule.xml?api_key=${apiKey}`;

    const response = await Tp.Helpers.Http.get(scheduleUrl);
    const parsed = await Tp.Helpers.Xml.parseString(response);
    const games = parsed.league['daily-schedule'][0].games[0].game;

    let game = null;
    for (let i = 0; i < games.length; i++) {
        if (games[i].$.status === 'closed')
            continue;

        if (games[i].home[0].$.abbr.toLowerCase() === team ||
            games[i].away[0].$.abbr.toLowerCase() === team) {
            game = games[i];
            break;
        }
    }
    if (game === null) {
        console.log('No scheduled games found for ' + team);
        return null;
    }

    console.log('Found game ' + game.$.id + ': ' + game.home[0].$.abbr + ' vs. ' + game.away[0].$.abbr);
    return game;
}

async function getBoxScore(apiKey, gameId, is_home) {
    const url = `https://api.sportradar.us/mlb-t5/games/${gameId}/boxscore.xml?api_key=${apiKey}`;
    const response = await Tp.Helpers.Http.get(url);
    const parsed = await Tp.Helpers.Xml.parseString(response);
    let game_inning = null;
    if (parsed.game.$.status === 'closed' || parsed.game.$.status === 'complete')
        game_inning = String(parsed.game.final[0].$.inning_half) + String(parsed.game.final[0].$.inning);
    else
        game_inning = String(parsed.game.outcome[0].$.current_inning_half) + String(parsed.game.outcome[0].$.current_inning);

    const awayRuns = Number(parsed.game.away[0].$.runs);
    const homeRuns = Number(parsed.game.home[0].$.runs);

    if (is_home)
        return { game_inning, opponent_runs: awayRuns, team_runs: homeRuns, status: parsed.game.$.status };
    else
        return { game_inning, opponent_runs: homeRuns, team_runs: awayRuns, status: parsed.game.$.status };
}

function getOpponent(game, team, is_home) {
    if (is_home)
        return new Tp.Value.Entity(game.away[0].$.abbr.toLowerCase(), game.away[0].$.market + ' ' + game.away[0].$.name);
    else
        return new Tp.Value.Entity(game.home[0].$.abbr.toLowerCase(), game.home[0].$.market + ' ' + game.home[0].$.name);
}

function computeResult(game_status, team_runs, opponent_runs) {
    if (game_status !== 'closed' && game_status !== 'complete')
        return 'unclosed';

    if (team_runs > opponent_runs)
        return 'win';
    if (opponent_runs > team_runs)
        return 'lose';
    return 'draw';
}

async function getGameDetails(apiKey, game, team) {
    const is_home = team === game.home[0].$.abbr.toLowerCase();
    return getBoxScore(apiKey, game.$.id, is_home);
}

module.exports = makeGetAndSubscribe(getNextGame, getGameDetails, (team, game, gameDetails) => {
    const is_home = String(team) === game.home[0].$.abbr.toLowerCase();

    if (game.$.status === 'scheduled') {
        return {
            team: team,
            opponent: getOpponent(game, team, is_home),
            is_home: is_home,
            game_status: 'scheduled',
            scheduled_time: new Date(game.$.scheduled),
            game_inning: 'Pre',
            opponent_runs: 0,
            team_runs: 0,
            result: 'unclosed'
        };
    } else {
        const { game_inning, opponent_runs, team_runs, status } = gameDetails;
        return {
            team: team,
            opponent: getOpponent(game, team, is_home),
            is_home: is_home,
            game_status: status,
            scheduled_time: new Date(game.$.scheduled),
            game_inning: game_inning,
            opponent_runs: opponent_runs,
            team_runs: team_runs,
            result: computeResult(status, team_runs, opponent_runs)
        };
    }
}, { defaultApiKey: API_KEY });
