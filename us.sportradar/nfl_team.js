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
const NFL_JSON = require("./teams/nfl.json");

const NFL_SCHEDULE_URL =
    "https://api.sportradar.us/nfl/official/trial/v5/en/games/%d/reg/%d/schedule.json?api_key=%s";
const NFL_BOXSCORE_URL =
    "https://api.sportradar.us/nfl/official/trial/v5/en/games/%s/boxscore.json?api_key=%s";
const NFL_RANKINGS_URL =
    "https://api.sportradar.us/nfl/official/trial/v5/en/seasons/%s/standings.json?api_key=%s";
const NFL_ROSTER_URL =
    "https://api.sportradar.us/nfl/official/trial/v5/en/teams/%s/full_roster.json?api_key=%s";

module.exports = class NFLSportRadarAPIDevice {
    constructor(platform, key) {
        this.platform = platform;
        this.name = "Sport Radar NFL Channel";
        this.description = "The NFL Channel for Sport Radar";
        this._api_key = key;
    }

    get_games(week, year) {
        if (week === undefined || week === null) week = 1;
        const now = new Date();
        year = year ?
            year :
            now.getMonth() > 10 ?
            now.getFullYear() :
            now.getFullYear() - 1;

        const url = NFL_SCHEDULE_URL.format(
            year,
            week,
            this._api_key
        );
        return Tp.Helpers.Http.get(url).then((response) => {
            const parsed = JSON.parse(response);
            return parsed.week.games
                .filter((game) => !!this._response(game))
                .map((game) => {
                    return {
                        home_team: createTpEntity(game.home, "alias"),
                        home_score: game.scoring.home_points,
                        away_team: createTpEntity(game.away, "alias"),
                        away_score: game.scoring.away_points,
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

        const url = NFL_RANKINGS_URL.format(year, this._api_key);

        return Tp.Helpers.Http.get(url).then((response) => {
            const parsed = JSON.parse(response);
            const conferences = parsed.conferences;
            for (const conference of conferences) {
                const divisions = conference.divisions;
                for (const division of divisions) {
                    const teams = division.teams;
                    for (const t of teams) {
                        if (t.id === teamInfo.id) {
                            return [{
                                divisionPos: t.rank.division,
                                divisionName: division.name,
                                conferencePos: t.rank.conference,
                                conferenceName: conference.name,
                            }];
                        }
                    }
                }
            }
            throw new Error(`Team ${team.display} not found.`);
        });

    }

    get_boxscore(week, year) {
        if (week === undefined || week === null) week = 1;

        const now = new Date();
        year = year ?
            year :
            now.getMonth() > 10 ?
            now.getFullYear() :
            now.getFullYear() - 1;

        const url = NFL_SCHEDULE_URL.format(
            year,
            week,
            this._api_key
        );

        return Tp.Helpers.Http.get(url).then((response) => {
            const parsed = JSON.parse(response);
            return Promise.all(
                parsed.week.games
                .filter((game) => !!this._response(game))
                .map((game) => {
                    if (game.status === "scheduled") {
                        return {
                            __response: this._response(game)
                        };
                    } else {
                        const awayTeam = game.away.name;
                        const homeTeam = game.home.name;
                        const awayScore = game.scoring.away_points;
                        const homeScore = game.scoring.home_points;
                        return Tp.Helpers.Http.get(
                            NFL_BOXSCORE_URL.format(game.id, this
                                ._api_key)
                        ).then((response) => {
                            const parsed = JSON.parse(response);
                            const homeQuarters = [];
                            const awayQuarters = [];
                            for (let i = 0; i < 4; i++) {
                                try {
                                    homeQuarters.push(
                                        parsed.scoring[i].points
                                    );
                                    awayQuarters.push(
                                        parsed.scoring[i].points
                                    );
                                } catch (error) {
                                    homeQuarters.push(0);
                                    awayQuarters.push(0);
                                }
                            }
                            return {
                                home_team: createTpEntity(
                                    homeTeam,
                                    "alias"
                                ),
                                home_score: homeScore,
                                home_quarter1: homeQuarters[0],
                                home_quarter2: homeQuarters[1],
                                home_quarter3: homeQuarters[2],
                                home_quarter4: homeQuarters[3],
                                away_team: createTpEntity(
                                    awayTeam,
                                    "alias"
                                ),
                                away_score: awayScore,
                                away_quarter1: awayQuarters[0],
                                away_quarter2: awayQuarters[1],
                                away_quarter3: awayQuarters[2],
                                away_quarter4: awayQuarters[3],
                            };

                        });
                    }
                })
            );
        });

    }

    get_roster(team) {
        const teamInfo = this._team(team);
        return Tp.Helpers.Http.get(NFL_ROSTER_URL.format(teamInfo.id, this._api_key))
            .then((response) => {
                const parsed = JSON.parse(response);
                const team_members = [];

                const players = parsed.players;
                const coaches = parsed.coaches;

                for (const player of players) {
                    team_members.push({
                        position: player.position,
                        member: player.name,
                    });
                }

                const sortedRoster = team_members.sort((a, b) => {
                    return a.member.localeCompare(b.member);
                });
                for (const coach of coaches) {
                    if (coach.position === "Head Coach") {
                        const head_coach = coach.full_name;
                        sortedRoster.push({
                            position: coach.position,
                            member: head_coach,
                        });
                    }
                }
                return sortedRoster;
            });
    }

    _team(team) {
        const team_name = team.value;
        const conferences = NFL_JSON.conferences;
        for (const conference of conferences) {
            const divisions = conference.divisions;
            for (const division of divisions) {
                const teams = division.teams;
                for (const team of teams) {
                    const name = team.alias.toLowerCase();
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
        const awayPoints = game.away_points;
        const homePoints = game.home_points;
        const dateTime = new Date(game.scheduled);
        switch (game.status) {
            case "flex-schedule":
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
            case "canceled":
                status_message = "The game has been canceled";
                break;

            case "delayed":
                status_message = "The game has been delayed";
                break;

            case "unnecessary":
                status_message =
                    "The game was scheduled to occur, but is now deemed unnecessary";
                break;

            case "postponed":
                status_message = "The game has been postponed";
                break;

            case "time-tbd":
                status_message =
                    "The game has been scheduled but the time has yet to be announced";
                break;

            default:
                status_message = "The status of the game is " + status;
        }

        return {
            __response: status_message
        };
    }
};