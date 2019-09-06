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
const NCAA_FB_JSON = require("./teams/ncaafb-fbs.json");

const NCAA_FB_SCHEDULE_URL =
    "https://api.sportradar.us/ncaafb-t1/%d/REG/%d/schedule.json?api_key=%s";
const NCAA_FB_BOXSCORE_URL =
    "https://api.sportradar.us/ncaafb-t1/%d/REG/%d/%s/%s/boxscore.json?api_key=%s";
const NCAA_FB_RANKINGS_URL =
    "https://api.sportradar.us/ncaafb-t1/teams/FBS/%s/REG/standings.json?api_key=%s";
const NCAA_FB_ROSTER_URL =
    "https://api.sportradar.us//ncaafb-t1/teams/%s/roster.json?api_key=%s";

module.exports = class NCAAFBSportRadarAPIDevice {
    constructor(platform, key) {
        this.platform = platform;
        this.name = "Sport Radar NCAA Football Channel";
        this.description = "The NCAA Football Channel for Sport Radar";
        this._api_key = key;
    }

    _createTpEntity(team) {

        try {
            const teamInfo = this._team(team);
            const team_name = teamInfo.market + teamInfo.name;
            return new Tp.Value.Entity(team.toLowerCase(), team_name);
        } catch (error) {
            return new Tp.Value.Entity(team.toLowerCase(), team);
        }

    }

    get_games(week, year) {

        if (week === undefined || week === null) week = 1;
        const now = new Date();
        year = year ?
            year :
            now.getMonth() > 10 ?
            now.getFullYear() :
            now.getFullYear() - 1;

        const url = NCAA_FB_SCHEDULE_URL.format(
            year,
            week,
            this._api_key
        );
        return Tp.Helpers.Http.get(url).then((response) => {
            const parsed = JSON.parse(response);
            return parsed.games
                .filter((game) => !!this._response(game))
                .map((game) => {

                    return {
                        home_team: this._createTpEntity(game.home),
                        home_score: game.home_points,
                        away_team: this._createTpEntity(game.away),
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

        const url = NCAA_FB_RANKINGS_URL.format(year, this._api_key);

        return Tp.Helpers.Http.get(url).then((response) => {
            const parsed = JSON.parse(response);
            const conferences = parsed.division.conferences;
            for (const conference of conferences) {
                const teams = conference.teams;
                for (const t of teams) {
                    if (t.id.toLowerCase() === teamInfo.alias) {
                        return [{
                            conferenceName: conference.name,
                            wins: t.overall.wins,
                            losses: t.overall.losses,
                        }];
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

        const url = NCAA_FB_SCHEDULE_URL.format(
            year,
            week,
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
                        const awayTeam = game.away;
                        const homeTeam = game.home;
                        const awayScore = game.away_points;
                        const homeScore = game.home_points;
                        return Tp.Helpers.Http.get(
                            NCAA_FB_BOXSCORE_URL.format(year, week, awayTeam,
                                homeTeam, this._api_key)
                        ).then((response) => {
                            const parsed = JSON.parse(response);
                            const homeQuarters = [];
                            const awayQuarters = [];
                            for (let i = 0; i < 4; i++) {
                                try {
                                    homeQuarters.push(
                                        parsed.home_team.scoring[i].points
                                    );
                                    awayQuarters.push(
                                        parsed.away_team.scoring[i].points
                                    );
                                } catch (error) {
                                    homeQuarters.push(0);
                                    awayQuarters.push(0);
                                }
                            }
                            return {
                                home_team: this._createTpEntity(
                                    homeTeam),
                                home_score: homeScore,
                                home_quarter1: homeQuarters[0],
                                home_quarter2: homeQuarters[1],
                                home_quarter3: homeQuarters[2],
                                home_quarter4: homeQuarters[3],
                                away_team: this._createTpEntity(
                                    awayTeam,
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
        return Tp.Helpers.Http.get(NCAA_FB_ROSTER_URL.format(teamInfo.alias, this._api_key))
            .then((response) => {
                const parsed = JSON.parse(response);
                const team_members = [];

                const players = parsed.players;
                const coaches = parsed.coaches;

                for (const player of players) {
                    {
                        team_members.push({
                            position: player.position,
                            member: player.name_full,
                        });
                    }
                }

                const sortedRoster = team_members.sort((a, b) => {
                    return a.member.localeCompare(b.member);
                });

                for (const coach of coaches) {
                    if (coach.position === "Head Coach") {
                        const head_coach = coach.name_full;
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

        let team_name;
        if (team.value !== undefined)
            team_name = team.value;
        else
            team_name = team.toLowerCase();

        const conferences = NCAA_FB_JSON.conferences;
        for (const conference of conferences) {
            const subdivisions = conference.subdivisions;
            if (subdivisions !== undefined && subdivisions.length > 0) {
                for (const subdivision of subdivisions) {
                    const teams = subdivision.teams;
                    for (const team of teams) {
                        const name = team.id.toLowerCase();
                        if (name === team_name) {
                            return {
                                market: team.market,
                                name: team.name,
                                alias: name,
                            };
                        }
                    }
                }
            } else {
                const teams = conference.teams;
                for (const team of teams) {
                    const name = team.id.toLowerCase();
                    if (name === team_name) {
                        return {
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