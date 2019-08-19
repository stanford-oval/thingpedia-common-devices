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

const NCAA_MB_API_KEY = "7584setd3gx4uecy952exvxg";
const NCAA_MB_SCHEDULE_URL =
    "https://api.sportradar.us/ncaamb/trial/v4/en/games/%s/%s/%s/schedule.json?api_key=" +
    NCAA_MB_API_KEY;
const NCAA_MB_BOXSCORE_URL =
    "https://api.sportradar.us/ncaamb/trial/v4/en/games/%s/boxscore.json?api_key=" +
    NCAA_MB_API_KEY;
const NCAA_MB_RANKINGS_URL =
    "https://api.sportradar.us/ncaamb/trial/v4/en/seasons/%s/REG/standings.json?api_key=" +
    NCAA_MB_API_KEY;
const NCAA_MB_ROSTER_URL =
    "https://api.sportradar.us/ncaamb/trial/v4/en/teams/%s/profile.json?api_key=" +
    NCAA_MB_API_KEY;
const NCAA_MB_JSON = require("./teams/ncaamb.json");

module.exports = class NcaaMensBasketballSportRadarAPIDevice {
    constructor(platform) {
        this.platform = platform;
        this.name = "Sport Radar NCAA Men's Basketball Channel";
        this.description = "The NCAA Men's Basketball Channel for Sport Radar";
    }

    _updateUrl() {
        const now = new Date();
        this.schedule_url = NCAA_MB_SCHEDULE_URL.format(
            now.getFullYear(),
            now.getMonth() + 1,
            now.getDate()
        );
        this.rankings_url = NCAA_MB_RANKINGS_URL.format(now.getFullYear());
    }

    _createTpEntity(team) {
        return new Tp.Value.Entity(team.alias.toLowerCase(), team.name);
    }

    get_get_todays_games() {
        return Tp.Helpers.Http.get(this.schedule_url)
            .then((response) => {
                const parsed = JSON.parse(response);
                const game_statuses = [];

                const games = parsed.games;
                for (let i = 0; i < games.length; i++) {
                    const game_status = {
                        home_team: this._createTpEntity(games[i].home),
                        home_score: games[i].home_points,
                        away_team: this._createTpEntity(games[i].away),
                        away_score: games[i].away_points,
                        result: games[i].status,
                    };

                    game_statuses.push(game_status);
                }

                return game_statuses.map((game_status) => {
                    return game_status;
                });
            })
            .catch((e) => {
                throw new TypeError("No NCAA Men's Basketball Games Found");
            });
    }

    get_get_team(team) {
        return Tp.Helpers.Http.get(this.schedule_url)
            .then((response) => {
                const parsed = JSON.parse(response);
                const games = parsed.games;
                let gameStatus;
                let index = 0;
                const platform = this.platform;
                const team_name = team.team.value;
                const full_name = team.team.display;

                for (let i = 0; i < games.length; i++) {
                    if (
                        games[i].home.alias.toLowerCase() === team_name ||
                        games[i].away.alias.toLowerCase() === team_name
                    ) {
                        index = i;
                        gameStatus = games[i].status;
                    }
                }

                const scheduledTime = games[index].scheduled;
                const awayTeam = games[index].away.alias;
                const homeTeam = games[index].home.alias;
                const awayPoints = games[index].away_points;
                const homePoints = games[index].home_points;
                const dateTime = new Date(scheduledTime);
                let status_message;

                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        this.get_rankings(full_name).then((response) => {
                            const team_rankings = response;
                            switch (gameStatus) {
                                case undefined:
                                    status_message = "There is no %s game today. I can notify you when there is a game if you want?".format(
                                        full_name
                                    );
                                    resolve([
                                        {
                                            result: status_message,
                                            wins: team_rankings.wins,
                                            losses: team_rankings.losses,
                                            conferencePos:
                                                team_rankings.games_behind,
                                            conferenceName:
                                                team_rankings.conference,
                                        },
                                    ]);

                                    return;

                                case "scheduled":
                                    status_message = "Next game %s @ %s at %s".format(
                                        awayTeam,
                                        homeTeam,
                                        dateTime.toLocaleString(
                                            platform.locale,
                                            {
                                                timeZone: platform.timezone,
                                            }
                                        )
                                    );
                                    resolve([
                                        {
                                            result: status_message,
                                            wins: team_rankings.wins,
                                            losses: team_rankings.losses,
                                            conferencePos:
                                                team_rankings.games_behind,
                                            conferenceName:
                                                team_rankings.conference,
                                        },
                                    ]);

                                    return;
                                case "inprogress":
                                    status_message = "Game update for %s @ %s: %d - %d".format(
                                        awayTeam,
                                        homeTeam,
                                        awayPoints,
                                        homePoints
                                    );
                                    resolve([
                                        {
                                            result: status_message,
                                            wins: team_rankings.wins,
                                            losses: team_rankings.losses,
                                            conferencePos:
                                                team_rankings.games_behind,
                                            conferenceName:
                                                team_rankings.conference,
                                        },
                                    ]);

                                    return;
                                case "halftime":
                                    status_message = "Half-time for %s @ %s: %d - %d".format(
                                        awayTeam,
                                        homeTeam,
                                        awayPoints,
                                        homePoints
                                    );
                                    resolve([
                                        {
                                            result: status_message,
                                            wins: team_rankings.wins,
                                            losses: team_rankings.losses,
                                            conferencePos:
                                                team_rankings.games_behind,
                                            conferenceName:
                                                team_rankings.conference,
                                        },
                                    ]);

                                    return;
                                case "complete":
                                    status_message =
                                        "The game is complete and statistics are being reviewed";
                                    resolve([
                                        {
                                            result: status_message,
                                            wins: team_rankings.wins,
                                            losses: team_rankings.losses,
                                            conferencePos:
                                                team_rankings.games_behind,
                                            conferenceName:
                                                team_rankings.conference,
                                        },
                                    ]);

                                    return;
                                case "closed":
                                    status_message = "Final score for %s @ %s: %d - %d".format(
                                        awayTeam,
                                        homeTeam,
                                        awayPoints,
                                        homePoints
                                    );
                                    resolve([
                                        {
                                            result: status_message,
                                            wins: team_rankings.wins,
                                            losses: team_rankings.losses,
                                            conferencePos:
                                                team_rankings.games_behind,
                                            conferenceName:
                                                team_rankings.conference,
                                        },
                                    ]);

                                    return;
                            }

                            const status = this.statusConditions(gameStatus);
                            status[0].wins = team_rankings.wins;
                            status[0].losses = team_rankings.losses;
                            status[0].conferencePos =
                                team_rankings.games_behind;
                            status[0].conferenceName = team_rankings.conference;

                            resolve(status);
                        });
                    }, 1000);
                });
            })
            .catch((e) => {
                throw new TypeError("No NCAA Men's Basketball Games Found");
            });
    }

    get_rankings(input_team) {
        this._updateUrl();

        return Tp.Helpers.Http.get(this.rankings_url)
            .then((response) => {
                const parsed = JSON.parse(response);
                const conferences = parsed.conferences;
                for (const conference of conferences) {
                    const teams = conference.teams;
                    for (const team of teams) {
                        const team_name = `${team.market} ${team.name}`;
                        if (team_name === input_team) {
                            return {
                                conference: conference.name,
                                wins: team.wins,
                                losses: team.losses,
                                games_behind: team.games_behind.conference,
                            };
                        }
                    }
                }
                throw new TypeError("Invalid Team Input");
            })
            .catch((e) => {
                throw new TypeError("Invalid Team Input");
            });
    }

    get_get_boxscore(team) {
        return Tp.Helpers.Http.get(this.schedule_url)
            .then((response) => {
                const parsed = JSON.parse(response);
                const games = parsed.games;
                const team_name = team.team.value;
                const full_name = team.team.display;

                let index = 0;
                let gameStatus;
                let gameId = "";
                const platform = this.platform;

                for (let i = 0; i < games.length; i++) {
                    if (
                        games[i].home.alias.toLowerCase() === team_name ||
                        games[i].away.alias.toLowerCase() === team_name
                    ) {
                        index = i;
                        gameStatus = games[i].status;
                        gameId = games[i].id;
                    }
                }

                const homeTeam = games[index].home;
                const awayTeam = games[index].away;
                const homeScore = games[index].home_points;
                const awayScore = games[index].away_points;
                const scheduledTime = games[index].scheduled;
                const dateTime = new Date(scheduledTime);

                switch (gameStatus) {
                    case undefined:
                        return [
                            {
                                status_message: "There is no %s game today. I can notify you when there is a game if you want?".format(
                                    full_name
                                ),
                            },
                        ];
                    case "scheduled":
                        return [
                            {
                                status_message: "Next game %s @ %s at %s".format(
                                    awayTeam.name,
                                    homeTeam.name,
                                    dateTime.toLocaleString(platform.locale, {
                                        timeZone: platform.timezone,
                                    })
                                ),
                            },
                        ];
                    case "closed":
                    case "halftime":
                    case "inprogress":
                        return new Promise((resolve, reject) => {
                            const url = NCAA_MB_BOXSCORE_URL.format(gameId);
                            setTimeout(() => {
                                Tp.Helpers.Http.get(url).then((response) => {
                                    const parsed = JSON.parse(response);
                                    const homeHalves = [];
                                    const awayHalves = [];
                                    let homeLeader = "";
                                    let awayLeader = "";
                                    for (let i = 0; i < 4; i++) {
                                        try {
                                            homeHalves.push(
                                                parsed.home.scoring[i].points
                                            );
                                            awayHalves.push(
                                                parsed.away.scoring[i].points
                                            );
                                        } catch (error) {
                                            homeHalves.push(0);
                                            awayHalves.push(0);
                                        }
                                    }
                                    try {
                                        homeLeader =
                                            parsed.home.leaders.points[0]
                                                .full_name;
                                        awayLeader =
                                            parsed.away.leaders.points[0]
                                                .full_name;
                                    } catch (error) {
                                        console.log(error);
                                    }

                                    const box_score = [
                                        {
                                            home_team: this._createTpEntity(
                                                homeTeam
                                            ),
                                            home_score: homeScore,
                                            home_half1: homeHalves[0],
                                            home_half2: homeHalves[1],
                                            home_leading_scorer: homeLeader,
                                            away_team: this._createTpEntity(
                                                awayTeam
                                            ),
                                            away_score: awayScore,
                                            away_half1: awayHalves[0],
                                            away_half2: awayHalves[1],
                                            away_leading_scorer: awayLeader,
                                            status_message:
                                                "Game Status: " + gameStatus,
                                        },
                                    ];

                                    resolve(box_score);
                                });
                            }, 1000);
                        });
                }
                return this.statusConditions(gameStatus);
            })
            .catch((e) => {
                throw new TypeError("No NCAA Men's Basketball Games Found");
            });
    }

    get_get_roster(team) {
        this._updateUrl();
        const team_name = team.team.value;
        const nba_info = NCAA_MB_JSON;
        const divisions = nba_info.divisions;
        for (const division of divisions) {
            if (division.alias === "D1") {
                const conferences = division.conferences;

                for (const conference of conferences) {
                    const teams = conference.teams;
                    if (teams.length > 0) {
                        for (const team of teams) {
                            const name = team.alias.toLowerCase();
                            if (name === team_name) {
                                console.log(team.id);
                                return Tp.Helpers.Http.get(
                                    NCAA_MB_ROSTER_URL.format(team.id)
                                ).then((response) => {
                                    const parsed = JSON.parse(response);
                                    const team_members = [];

                                    const players = parsed.players;
                                    const coaches = parsed.coaches;

                                    for (const player of players) {
                                        team_members.push({
                                            member:
                                                player.position +
                                                ": " +
                                                player.full_name,
                                        });
                                    }

                                    const sortedRoster = team_members.sort(
                                        (a, b) => {
                                            return a.member.localeCompare(
                                                b.member
                                            );
                                        }
                                    );

                                    for (const coach of coaches) {
                                        if (coach.position === "Head Coach") {
                                            const head_coach = coach.full_name;
                                            sortedRoster.push({
                                                member:
                                                    "Head Coach: " + head_coach,
                                            });
                                        }
                                    }
                                    return sortedRoster;
                                });
                            }
                        }
                    }
                }
            }
        }
        throw new TypeError("Invalid Team Input");
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

            case "postponed":
                status_message = "The game has been postponed";
                return [
                    {
                        result: status_message,
                    },
                ];

            case "time-tbd":
                status_message =
                    "The game has been scheduled but the time has yet to be announced";
                return [
                    {
                        result: status_message,
                    },
                ];

            case "created":
                status_message =
                    "The game has just began and information is being logged";
                return [
                    {
                        result: status_message,
                    },
                ];
        }

        return [];
    }
};
