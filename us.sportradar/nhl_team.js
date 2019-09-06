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
const NHL_JSON = require("./teams/nhl.json");

const NHL_SCHEDULE_URL =
    "https://api.sportradar.us/nhl/trial/v6/en/games/%d/%d/%d/schedule.json?api_key=%s";
const NHL_BOXSCORE_URL =
    "https://api.sportradar.us/nhl/trial/v6/en/games/%s/boxscore.json?api_key=%s";
const NHL_RANKINGS_URL =
    "https://api.sportradar.us/nhl/trial/v6/en/seasons/%s/REG/rankings.json?api_key=%s";
const NHL_ROSTER_URL =
    "https://api.sportradar.us/nhl/trial/v6/en/teams/%s/profile.json?api_key=%s";

module.exports = class NHLSportRadarAPIDevice {
    constructor(platform, key) {
        this.platform = platform;
        this.name = "Sport Radar NHL Channel";
        this.description = "The NHL Channel for Sport Radar";
        this._api_key = key;
    }

    get_games(date) {
        if (date === undefined || date === null) date = new Date();

        const url = NHL_SCHEDULE_URL.format(
            date.getFullYear(),
            date.getMonth() + 1,
            date.getDate(),
            this._api_key
        );

        return Tp.Helpers.Http.get(url).then((response) => {
            const parsed = JSON.parse(response);
            return parsed.games
                .filter((game) => !!this._response(game))
                .map((game) => {
                    return {
                        home_team: createTpEntity(game.home, "alias"),
                        home_score: game.home_points,
                        away_team: createTpEntity(game.away, "alias"),
                        away_score: game.away_points,
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

        const url = NHL_RANKINGS_URL.format(year, this._api_key);
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

    get_boxscore(date) {

        if (date === undefined || date === null) date = new Date();

        const url = NHL_SCHEDULE_URL.format(
            date.getFullYear(),
            date.getMonth() + 1,
            date.getDate(),
            this._api_key
        );
        return Tp.Helpers.Http.get(url).then((response) => {
            const parsed = JSON.parse(response);
            return Promise.all(
                parsed.games
                .filter((game) => !!this._response(game))
                .map((game) => {
                    if (game.status === "scheduled") {
                        return {
                            __response: this._response(game)
                        };
                    } else {
                        const awayTeam = game.away.name;
                        const homeTeam = game.home.name;
                        const awayScore = game.away_points;
                        const homeScore = game.home_points;

                        return Tp.Helpers.Http.get(
                            NHL_BOXSCORE_URL.format(game.id, this._api_key)
                        ).then((response) => {
                            const parsed = JSON.parse(response);
                            const homePeriods = [];
                            const awayPeriods = [];
                            let homeLeader = "";
                            let awayLeader = "";
                            for (let i = 0; i < 4; i++) {
                                try {
                                    homePeriods.push(
                                        parsed.home.scoring[i].points
                                    );
                                    awayPeriods.push(
                                        parsed.away.scoring[i].points
                                    );
                                } catch (error) {
                                    homePeriods.push(0);
                                    awayPeriods.push(0);
                                }
                            }
                            try {
                                homeLeader =
                                    parsed.home.leaders.points[0].full_name;
                                awayLeader =
                                    parsed.away.leaders.points[0].full_name;
                            } catch (error) {
                                console.log(error);
                            }

                            return {
                                home_team: createTpEntity(
                                    homeTeam,
                                    "alias"
                                ),
                                home_score: homeScore,
                                home_period1: homePeriods[0],
                                home_period2: homePeriods[1],
                                home_period3: homePeriods[2],
                                home_leading_scorer: homeLeader,
                                away_team: createTpEntity(
                                    awayTeam,
                                    "alias"
                                ),
                                away_score: awayScore,
                                away_period1: awayPeriods[0],
                                away_period2: awayPeriods[1],
                                away_period3: awayPeriods[2],
                                away_leading_scorer: awayLeader,
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
            NHL_ROSTER_URL.format(teamInfo.id, this._api_key)
        ).then((response) => {
            const parsed = JSON.parse(response);
            const team_members = [];

            const players = parsed.players;
            const coaches = parsed.coaches;

            for (const player of players) {
                team_members.push({
                    position: player.primary_position,
                    member: player.full_name,
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
        const conferences = NHL_JSON.conferences;
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

            case "if_necessary":
                status_message = "The game will be scheduled if necessary";
                break;

            case "postponed":
                status_message = "The game has been postponed";
                break;

            case "time-tbd":
                status_message =
                    "The game has been scheduled but the time has yet to be announced";
                break;

            case "created":
                status_message =
                    "The game has just began and information is being logged";
                break;

            default:
                status_message = "The status of the game is " + status;
        }
        return {
            __response: status_message
        };
    }
};