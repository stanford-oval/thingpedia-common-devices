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

const SOCCER_EU_API_KEY = "bqusuccn5zubfc4m6p9sspr2";
const SOCCER_EU_SCHEDULE_URL =
    "https://api.sportradar.us/soccer-t3/eu/en/schedules/%s/schedule.json?api_key=" +
    SOCCER_EU_API_KEY;
const SOCCER_EU_LIVE_URL =
    "https://api.sportradar.us/soccer-t3/eu/en/schedules/live/results.json?api_key=" +
    SOCCER_EU_API_KEY;
const SOCCER_EU_CLOSED_URL =
    "https://api.sportradar.us/soccer-t3/eu/en/schedules/%s/results.json?api_key=" +
    SOCCER_EU_API_KEY;
const SOCCER_EU_TOURNAMENT_RANKINGS =
    "https://api.sportradar.us/soccer-t3/eu/en/tournaments/%s/standings.json?api_key=" +
    SOCCER_EU_API_KEY;

module.exports = class SoccerEUSportRadarAPIDevice {
    constructor(platform) {
        this.platform = platform;
        this.name = "Sport Radar EU Soccer Channel";
        this.description = "The EU Soccer Channel for Sport Radar";
    }

    _updateUrl() {
        const now = new Date();
        const date_url = "%d-%s-%s".format(
            now.getFullYear(),
            ("0" + (now.getMonth() + 1)).slice(-2),
            ("0" + now.getDate()).slice(-2)
        );
        this.date_url = date_url;
    }

    _createTpEntity(team) {
        return new Tp.Value.Entity(team.abbreviation.toLowerCase(), team.name);
    }

    get_get_todays_games(input_league) {
        this._updateUrl();
        const leagueId = input_league.soccer_league.value;
        return Tp.Helpers.Http.get(SOCCER_EU_SCHEDULE_URL.format(this.date_url))
            .then((response) => {
                const parsed = JSON.parse(response);
                const game_statuses = [];
                const games = parsed.sport_events;
                for (let i = 0; i < games.length; i++) {
                    const league = games[i].tournament.id;
                    if (league === leagueId) {
                        const game_status = {
                            home_team: this._createTpEntity(
                                games[i].competitors[0]
                            ),
                            away_team: this._createTpEntity(
                                games[i].competitors[1]
                            ),
                            tournament: games[i].tournament.name,
                            status: games[i].status,
                        };

                        game_statuses.push(game_status);
                    }
                }

                return game_statuses.map((game_status) => {
                    return game_status;
                });
            })
            .catch((e) => {
                throw new TypeError("No EU Soccer Games Found");
            });
    }

    get_live_results(team) {
        return Tp.Helpers.Http.get(SOCCER_EU_LIVE_URL)
            .then((response) => {
                const parsed = JSON.parse(response);
                const games = parsed.results;
                let index = 0;
                for (let i = 0; i < games.length; i++) {
                    if (
                        games[
                            i
                        ].sport_event.competitors[0].abbreviation.toLowerCase() ===
                            team ||
                        games[
                            i
                        ].sport_event.competitors[1].abbreviation.toLowerCase() ===
                            team
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
                const matchTime =
                    games[index].sport_event_status.clock.match_time;

                const box_score = [
                    {
                        home_team: this._createTpEntity(homeTeam),
                        home_score: homePoints,
                        home_half1: homeHalf1,
                        home_half2: homeHalf2,
                        away_team: this._createTpEntity(awayTeam),
                        away_score: awayPoints,
                        away_half1: awayHalf1,
                        away_half2: awayHalf2,
                        match_status: "Clock: " + matchTime,
                    },
                ];

                return box_score;
            })
            .catch((e) => {
                throw new TypeError("Invalid Team Input");
            });
    }

    get_closed_results(team) {
        return Tp.Helpers.Http.get(SOCCER_EU_CLOSED_URL.format(this.date_url))
            .then((response) => {
                const parsed = JSON.parse(response);
                const games = parsed.results;

                let index = 0;
                for (let i = 0; i < games.length; i++) {
                    if (
                        games[
                            i
                        ].sport_event.competitors[0].abbreviation.toLowerCase() ===
                            team ||
                        games[
                            i
                        ].sport_event.competitors[1].abbreviation.toLowerCase() ===
                            team
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

                const box_score = [
                    {
                        home_team: this._createTpEntity(homeTeam),
                        home_score: homePoints,
                        home_half1: homeHalf1,
                        home_half2: homeHalf2,
                        away_team: this._createTpEntity(awayTeam),
                        away_score: awayPoints,
                        away_half1: awayHalf1,
                        away_half2: awayHalf2,
                        match_status: "Game Status: Closed",
                    },
                ];

                return box_score;
            })
            .catch((e) => {
                throw new TypeError("Invalid Team Input");
            });
    }

    get_get_team(team) {
        this._updateUrl();
        return Tp.Helpers.Http.get(SOCCER_EU_SCHEDULE_URL.format(this.date_url))
            .then((response) => {
                const parsed = JSON.parse(response);
                const games = parsed.sport_events;
                const team_name = team.team.value;
                const full_name = team.team.display;

                let index = 0;
                let gameStatus;
                const self = this;
                const platform = this.platform;
                const scheduledTime = games[index].scheduled;
                const dateTime = new Date(scheduledTime);

                for (let i = 0; i < games.length; i++) {
                    if (
                        games[i].competitors[0].abbreviation.toLowerCase() ===
                            team_name ||
                        games[i].competitors[1].abbreviation.toLowerCase() ===
                            team_name
                    ) {
                        index = i;
                        gameStatus = games[i].status;
                    }
                }

                const homeTeam = games[index].competitors[0].name;
                const awayTeam = games[index].competitors[1].name;

                switch (gameStatus) {
                    case undefined:
                        return [
                            {
                                status_message: "There is no %s game today. I can notify you when there is a game if you want?".format(
                                    full_name
                                ),
                            },
                        ];

                    case "not_started":
                        return [
                            {
                                status_message: "Next game %s @ %s at %s".format(
                                    awayTeam,
                                    homeTeam,
                                    dateTime.toLocaleString(platform.locale, {
                                        timeZone: platform.timezone,
                                    })
                                ),
                            },
                        ];

                    case "live":
                        return new Promise((resolve, reject) => {
                            setTimeout(() => {
                                self.get_live_results(team_name).then(
                                    (response) => {
                                        resolve(response);
                                    }
                                );
                            }, 1000);
                        });

                    case "closed":
                        return new Promise((resolve, reject) => {
                            setTimeout(() => {
                                self.get_closed_results(team_name).then(
                                    (response) => {
                                        resolve(response);
                                    }
                                );
                            }, 1000);
                        });
                }

                return this.statusConditions(gameStatus);
            })
            .catch((e) => {
                throw new TypeError("No EU Soccer Games Found");
            });
    }

    get_get_rankings(input_league) {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                return Tp.Helpers.Http.get(
                    SOCCER_EU_TOURNAMENT_RANKINGS.format(
                        input_league.soccer_league.value
                    )
                )
                    .then((response) => {
                        const complete_standings = [];
                        const parsed = JSON.parse(response);
                        const standings = parsed.standings;
                        for (const standing of standings) {
                            const type = standing.type;
                            if (type === "total") {
                                const groups = standing.groups;
                                const areGroups = groups.length > 1;
                                let group_name;
                                for (const group of groups) {
                                    let validGroup = true;
                                    if (areGroups) {
                                        group_name = group.name;
                                        if (group_name === undefined)
                                            validGroup = false;
                                    }
                                    if (validGroup) {
                                        const team_standings =
                                            group.team_standings;
                                        complete_standings.push({
                                            group_name: group_name,
                                        });
                                        for (const team_standing of team_standings) {
                                            const team =
                                                team_standing.team.name;
                                            const rank = team_standing.rank;
                                            const standingsObj = {};
                                            standingsObj.team_name = team;
                                            standingsObj.team_rank = rank;
                                            complete_standings.push(
                                                standingsObj
                                            );
                                        }
                                    }
                                }
                                break;
                            }
                        }
                        resolve(
                            complete_standings.map((team_standings) => {
                                return team_standings;
                            })
                        );
                    })
                    .catch((e) => {
                        throw new TypeError(
                            `Can't get standings for the ${input_league.soccer_league.value}`
                        );
                    });
            }, 1000);
        });
    }

    statusConditions(gameStatus) {
        let status_message;
        switch (gameStatus) {
            case "canceled":
                status_message = "The game has been canceled";
                return [
                    {
                        result: status_message,
                    },
                ];

            case "delayed":
                status_message = "The game has been delayed";
                return [
                    {
                        result: status_message,
                    },
                ];

            case "unnecessary":
                status_message =
                    "The game was scheduled to occur, but is now deemed unnecessary";
                return [
                    {
                        result: status_message,
                    },
                ];

            case "if_necessary":
                status_message = "The game will be scheduled if necessary";
                return [
                    {
                        result: status_message,
                    },
                ];

            case "start_delayed":
                status_message = "The start of this match has been delayed";
                return [
                    {
                        result: status_message,
                    },
                ];

            case "abandoned":
                status_message = "The game has been abandoned";
                return [
                    {
                        result: status_message,
                    },
                ];
        }

        return [];
    }
};
