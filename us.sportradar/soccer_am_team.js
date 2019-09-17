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

const SOCCER_AM_SCHEDULE_URL =
    "https://api.sportradar.us/soccer-t3/am/en/schedules/%s/schedule.json?api_key=%s";
const SOCCER_AM_LIVE_URL =
    "https://api.sportradar.us/soccer-t3/am/en/schedules/live/results.json?api_key=%s";
const SOCCER_AM_CLOSED_URL =
    "https://api.sportradar.us/soccer-t3/am/en/schedules/%s/results.json?api_key=%s";
const SOCCER_AM_TOURNAMENT_RANKINGS =
    "https://api.sportradar.us/soccer-t3/am/en/tournaments/%s/standings.json?api_key=%s";

module.exports = class SoccerAMSportRadarAPIDevice {
    constructor(platform, key) {
        this.platform = platform;
        this.name = "Sport Radar America Soccer Channel";
        this.description = "The America Soccer Channel for Sport Radar";
        this._api_key = key;
    }

    get_games(league, date) {
        if (date === undefined || date === null) date = new Date();
        const formattedDate = "%d-%s-%s".format(
            date.getFullYear(),
            ("0" + (date.getMonth() + 1)).slice(-2),
            ("0" + date.getDate()).slice(-2)
        );

        const leagueId = league.value;

        const url = SOCCER_AM_SCHEDULE_URL.format(formattedDate, this
            ._api_key);
        return Tp.Helpers.Http.get(url).then((response) => {
            const parsed = JSON.parse(response);
            return parsed.sport_events
                .filter((game) => game.tournament.id === leagueId)
                .filter((game) => !!this._response(game))
                .map((game) => {

                    return {
                        home_team: createTpEntity(
                            game.competitors[0],
                            "abbreviation"
                        ),
                        away_team: createTpEntity(
                            game.competitors[1],
                            "abbreviation"
                        ),
                        status: game.status,
                        __response: this._response(game),
                    };
                });
        });
    }

    _get_live_results(teamId) {
        return Tp.Helpers.Http.get(SOCCER_AM_LIVE_URL).then((response) => {
            const parsed = JSON.parse(response);
            const games = parsed.results;
            let index;
            for (let i = 0; i < games.length; i++) {
                if (
                    games[i].sport_event.competitors[0].id === teamId ||
                    games[i].sport_event.competitors[1].id === teamId
                )
                    index = i;
            }

            const homePoints = games[index].sport_event_status.home_score;
            const awayPoints = games[index].sport_event_status.home_score;
            const awayTeam = games[index].sport_event.competitors[1];
            const homeTeam = games[index].sport_event.competitors[0];
            const homeHalf1 =
                games[index].sport_event_status.period_scores[0].home_score;
            const homeHalf2 =
                games[index].sport_event_status.period_scores[1].home_score;
            const awayHalf1 =
                games[index].sport_event_status.period_scores[0].away_score;
            const awayHalf2 =
                games[index].sport_event_status.period_scores[1].away_score;
            const matchTime = games[index].sport_event_status.clock.match_time;

            return [
                {
                    home_team: createTpEntity(homeTeam, "abbreviation"),
                    home_score: homePoints,
                    home_half1: homeHalf1,
                    home_half2: homeHalf2,
                    away_team: createTpEntity(awayTeam, "abbreviation"),
                    away_score: awayPoints,
                    away_half1: awayHalf1,
                    away_half2: awayHalf2,
                    match_status: "Clock: " + matchTime,
                },
            ];
        });
    }

    _get_closed_results(teamId, formattedDate) {
        const url = SOCCER_AM_CLOSED_URL.format(formattedDate, this._api_key);
        return Tp.Helpers.Http.get(url).then((response) => {
            const parsed = JSON.parse(response);
            const games = parsed.results;

            let index;
            for (let i = 0; i < games.length; i++) {
                if (
                    games[i].sport_event.competitors[0].id === teamId ||
                    games[i].sport_event.competitors[1].id === teamId
                )
                    index = i;
            }
            const homePoints = games[index].sport_event_status.home_score;
            const awayPoints = games[index].sport_event_status.away_score;
            const awayTeam = games[index].sport_event.competitors[1];
            const homeTeam = games[index].sport_event.competitors[0];
            const homeHalf1 =
                games[index].sport_event_status.period_scores[0].home_score;
            const homeHalf2 =
                games[index].sport_event_status.period_scores[1].home_score;
            const awayHalf1 =
                games[index].sport_event_status.period_scores[0].away_score;
            const awayHalf2 =
                games[index].sport_event_status.period_scores[1].away_score;

            return [
                {
                    home_team: createTpEntity(homeTeam, "abbreviation"),
                    home_score: homePoints,
                    home_half1: homeHalf1,
                    home_half2: homeHalf2,
                    away_team: createTpEntity(awayTeam, "abbreviation"),
                    away_score: awayPoints,
                    away_half1: awayHalf1,
                    away_half2: awayHalf2,
                    match_status: "The game has ended",
                },
            ];
        });
    }

    get_boxscore(league, date) {

        if (date === undefined || date === null) date = new Date();
        const formattedDate = "%d-%s-%s".format(
            date.getFullYear(),
            ("0" + (date.getMonth() + 1)).slice(-2),
            ("0" + date.getDate()).slice(-2)
        );

        const leagueId = league.value;

        const url = SOCCER_AM_SCHEDULE_URL.format(formattedDate, this._api_key);

        return Tp.Helpers.Http.get(url).then((response) => {
            const parsed = JSON.parse(response);
            return Promise.all(
                parsed.sport_events
                .filter((game) => game.tournament.id === leagueId)
                .filter((game) => !!this._response(game))
                .map((game) => {
                    const id = game.competitors[0].id;
                    if (game.status === "not_started") {
                        return {
                            __response: this._response(game),
                        };
                    } else if (game.status === "live") {
                        return this._get_live_results(id);
                    } else {
                        return this._get_closed_results(id, formattedDate);
                    }
                })
            );

        });
    }

    get_league_rankings(league) {

        return Tp.Helpers.Http.get(
            SOCCER_AM_TOURNAMENT_RANKINGS.format(league.value, this._api_key)
        ).then((response) => {
            const complete_standings = [];
            const parsed = JSON.parse(response);
            const standings = parsed.standings;
            for (const standing of standings) {
                const type = standing.type;
                if (type === "total") {
                    const groups = standing.groups;
                    const areGroups = groups.length > 1;
                    let group_name = "";
                    for (const group of groups) {
                        let validGroup = true;
                        if (areGroups) {
                            group_name = group.name;
                            if (group_name === undefined)
                                validGroup = false;
                        }
                        if (validGroup) {

                            const team_standings = group.team_standings;
                            for (const team_standing of team_standings) {
                                const team = team_standing.team;
                                const rank = team_standing.rank;
                                complete_standings.push({
                                    team: createTpEntity(team, "id"),
                                    teamRank: rank,
                                    groupName: group_name
                                });
                            }
                        }
                    }
                    break;
                }
            }
            return (complete_standings.map(
                (team_standings) => {
                    return team_standings;
                }));
        });

    }

    _response(game) {
        const homeTeam = game.competitors[0].name;
        const awayTeam = game.competitors[1].name;
        const dateTime = new Date(game.scheduled);
        switch (game.status) {
            case "not_started":
                return "Next game %s @ %s at %s".format(
                    awayTeam,
                    homeTeam,
                    dateTime.toLocaleString(this.platform.locale, {
                        timeZone: this.platform.timezone,
                    })
                );
            case "live":
                return "The %s @ %s game is live right now".format(
                    awayTeam,
                    homeTeam
                );
            case "closed":
                return "The %s @ %s game is over".format(awayTeam, homeTeam);

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

            case "start_delayed":
                status_message = "The start of this match has been delayed";
                break;

            case "abandoned":
                status_message = "The game has been abandoned";
                break;

            default:
                status_message = "The status of the game is " + status;
        }

        return {
            __response: status_message,
        };
    }
};