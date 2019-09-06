// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Ryan Cheng <ryachen@nuevaschool.org>
//
// See LICENSE for details
"use strict";

const Tp = require("thingpedia");
const { createTpEntity } = require("./utils");
const MLB_JSON = require("./teams/mlb.json");

const MLB_SCHEDULE_URL =
    "https://api.sportradar.us/mlb/trial/v6.5/en/games/%d/%d/%d/boxscore.json?api_key=%s";
const MLB_BOXSCORE_URL =
    "https://api.sportradar.us/mlb/trial/v6.5/en/games/%s/boxscore.json?api_key=%s";
const MLB_RANKINGS_URL =
    "https://api.sportradar.us/mlb/trial/v6.5/en/seasons/%d/REG/rankings.json?api_key=%s";
const MLB_ROSTER_URL =
    "https://api.sportradar.us/mlb/trial/v6.5/en/teams/%s/depth_chart.json?api_key=%s";

module.exports = class MLBSportRadarAPIDevice {
    constructor(platform, key) {
        this.platform = platform;
        this.name = "Sport Radar MLB Channel";
        this.description = "The MLB Channel for Sport Radar";
        this._api_key = key;
    }

    get_games(date) {
        if (date === undefined || date === null) date = new Date();

        const url = MLB_SCHEDULE_URL.format(
            date.getFullYear(),
            date.getMonth() + 1,
            date.getDate(),
            this._api_key
        );

        return Tp.Helpers.Http.get(url).then((response) => {
            const parsed = JSON.parse(response);
            return parsed.league.games
                .filter((game) => !!this._response(game.game))
                .map((game) => {
                    game = game.game;
                    return {
                        home_team: createTpEntity(game.home, "abbr"),
                        home_score: game.home.runs,
                        away_team: createTpEntity(game.away, "abbr"),
                        away_score: game.away.runs,
                        status: game.status,
                        __response: this._response(game),
                    };
                });
        });
    }

    get_team_ranking(team, year) {
        const teamInfo = this._team(team);
        const now = new Date();
        year = year ?
            year :
            now.getMonth() > 10 ?
            now.getFullYear() :
            now.getFullYear() - 1;

        const url = MLB_RANKINGS_URL.format(year, this._api_key);
        return Tp.Helpers.Http.get(url).then((response) => {
            const parsed = JSON.parse(response);
            const leagues = parsed.league.season.leagues;
            for (const league of leagues) {
                const divisions = league.divisions;
                for (const division of divisions) {
                    const teams = division.teams;
                    for (const t of teams) {
                        if (t.id === teamInfo.id) {
                            return [{
                                divisionPos: t.rank.division,
                                divisionName: division.name,
                                leaguePos: t.rank.league,
                                leagueName: league.name
                            }];

                        }
                    }
                }
            }
            throw new Error(`Team ${team.display} not found.`);
        });

    }
    get_boxscore(date) {
        if (date === undefined || date === null) date = new Date();

        const url = MLB_SCHEDULE_URL.format(
            date.getFullYear(),
            date.getMonth() + 1,
            date.getDate(),
            this._api_key
        );

        return Tp.Helpers.Http.get(url).then((response) => {
            const parsed = JSON.parse(response);
            return Promise.all(
                parsed.league.games
                .filter((game) => !!this._response(game.game))
                .map((game) => {
                    game = game.game;
                    if (game.status === "scheduled") {
                        return {
                            __response: this._response(game)
                        };
                    } else {
                        const awayTeam = game.away.name;
                        const homeTeam = game.home.name;
                        const awayScore = game.away.runs;
                        const homeScore = game.home.runs;

                        return Tp.Helpers.Http.get(
                            MLB_BOXSCORE_URL.format(game.id, this._api_key)
                        ).then((response) => {
                            const parsed = JSON.parse(response);
                            const homeInnings = [];
                            const awayInnings = [];
                            let homePitcher = "";
                            let awayPitcher = "";
                            for (let i = 0; i < 9; i++) {
                                try {
                                    homeInnings.push(
                                        parsed.game.home.scoring[i]
                                        .runs
                                    );
                                    awayInnings.push(
                                        parsed.game.away.scoring[i]
                                        .runs
                                    );
                                } catch (error) {
                                    homeInnings.push(0);
                                    awayInnings.push(0);
                                }
                            }
                            try {
                                homePitcher =
                                    parsed.game.home.starting_pitcher
                                    .preferred_name +
                                    " " +
                                    parsed.game.home.starting_pitcher
                                    .last_name;
                                awayPitcher =
                                    parsed.game.away.starting_pitcher
                                    .preferred_name +
                                    " " +
                                    parsed.game.away.starting_pitcher
                                    .last_name;
                            } catch (error) {
                                console.log(error);
                            }

                            return {
                                home_team: this._createTpEntity(
                                    homeTeam
                                ),
                                home_score: homeScore,
                                home_inning1: homeInnings[0],
                                home_inning2: homeInnings[1],
                                home_inning3: homeInnings[2],
                                home_inning4: homeInnings[3],
                                home_inning5: homeInnings[4],
                                home_inning6: homeInnings[5],
                                home_inning7: homeInnings[6],
                                home_inning8: homeInnings[7],
                                home_inning9: homeInnings[8],
                                home_starting_pitcher: homePitcher,
                                away_team: this._createTpEntity(
                                    awayTeam, "abbr"
                                ),
                                away_score: awayScore,
                                away_inning1: awayInnings[0],
                                away_inning2: awayInnings[1],
                                away_inning3: awayInnings[2],
                                away_inning4: awayInnings[3],
                                away_inning5: awayInnings[4],
                                away_inning6: awayInnings[5],
                                away_inning7: awayInnings[6],
                                away_inning8: awayInnings[7],
                                away_inning9: awayInnings[8],
                                away_starting_pitcher: awayPitcher,
                            };
                        });
                    }

                })
            );
        });
    }

    get_roster(team) {
        const teamInfo = this._team(team);
        return Tp.Helpers.Http.get(
            MLB_ROSTER_URL.format(teamInfo.id, this._api_key)
        ).then((response) => {
            const parsed = JSON.parse(response);
            const team_members = [];

            const positions = parsed.team.positions;

            for (const position of positions) {
                const position_name = position.name;
                if (
                    position_name !== "BP" &&
                    position_name !== "SP"
                ) {
                    const players = position.players;
                    for (const player of players) {
                        if (player.depth === 1) {
                            const player_name =
                                player.preferred_name +
                                " " +
                                player.last_name;
                            team_members.push({
                                position: position_name,
                                member: player_name
                            });
                        }
                    }
                } else if (position_name === "SP") {
                    const players = position.players;
                    for (let i = 0; i < players.length; i++) {
                        const player_name =
                            players[i].preferred_name +
                            " " +
                            players[i].last_name;

                        team_members.push({
                            position: `SP${i + 1}`,
                            member: player_name,
                        });
                    }
                }
            }

            const sortedRoster = team_members.sort((a, b) => {
                return a.position.localeCompare(b.position);
            });
            return sortedRoster;
        });
    }

    _team(team) {
        const team_name = team.value;
        const leagues = MLB_JSON.leagues;
        for (const league of leagues) {
            const divisions = league.divisions;
            for (const division of divisions) {
                const teams = division.teams;
                for (const team of teams) {
                    const name = team.abbr.toLowerCase();
                    if (name === team_name) {
                        return {
                            id: team.id,
                            market: team.market,
                            name: team.name,
                            alias: name,
                        };
                    }
                }
            }
        }
        throw new Error(`Team ${team} not found`);
    }

    _response(game) {
        const awayTeam = game.away.name;
        const homeTeam = game.home.name;
        const awayPoints = game.away.runs;
        const homePoints = game.home.runs;
        const dateTime = new Date(game.scheduled);
        switch (game.status) {
            case "scheduled":
                return "Next game %s @ %s at %s".format(
                    awayTeam,
                    homeTeam,
                    dateTime.toLocaleString(this.platform.locale, {
                        timeZone: this.platform.timezone,
                    })
                );
            case "inprogress":
                return "Game update for %s @ %s: %d - %d".format(
                    awayTeam,
                    homeTeam,
                    awayPoints,
                    homePoints
                );
            case "halftime":
                return "Half-time for %s @ %s: %d - %d".format(
                    awayTeam,
                    homeTeam,
                    awayPoints,
                    homePoints
                );
            case "complete":
            case "closed":
                return "Final score for %s @ %s: %d - %d".format(
                    awayTeam,
                    homeTeam,
                    awayPoints,
                    homePoints
                );
            default:
                return undefined;
        }
    }

    _fallback(status) {
        let status_message;
        switch (status) {
            case "wdelay":
                status_message = "The game has been delayed because of weather";
                break;
            case "fdelay":
                status_message =
                    "The game has been delayed because of facility issues";
                break;
            case "odelay":
                status_message = "The game has been delayed";
                break;
            case "canceled":
                status_message = "The game has been canceled";
                break;

            case "unnecessary":
                status_message =
                    "The game was scheduled to occur, but is now deemed unnecessary";
                break;

            case "if_necessary":
                status_message = "The game will be scheduled if necessary";
                break;

            case "postponed":
                status_message = "The game has been postponed";
                break;

            case "suspended":
                status_message = "The game has been suspended";
                break;

            case "maintenance":
                status_message = "The game failed review and is being repaired";
                break;
            default:
                status_message = "The status of the game is " + status;
        }
        return {
            __response: status_message
        };
    }
};