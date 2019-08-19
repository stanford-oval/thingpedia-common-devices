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

const NFL_API_KEY = "ru7baq9u5x3b4wh3q4g6p5qs";
const NFL_SCHEDULE_URL =
    "https://api.sportradar.us/nfl/official/trial/v5/en/games/%d/reg/%d/schedule.json?api_key=" +
    NFL_API_KEY;
const NFL_BOXSCORE_URL =
    "https://api.sportradar.us/nfl/official/trial/v5/en/games/%s/boxscore.json?api_key=" +
    NFL_API_KEY;
const NFL_STANDINGS_URL =
    "https://api.sportradar.us/nfl/official/trial/v5/en/seasons/%s/standings.json?api_key=" +
    NFL_API_KEY;
const NFL_ROSTER_URL =
    "https://api.sportradar.us/nfl/official/trial/v5/en/teams/%s/full_roster.json?api_key=" +
    NFL_API_KEY;

const NFL_JSON = require("./teams/nfl.json");

module.exports = class NFLSportRadarAPIDevice {
    constructor(platform) {
        this.platform = platform;
        this.name = "Sport Radar NFL Channel";
        this.description = "The NFL Channel for Sport Radar";
        const seasonStart = new Date();

        seasonStart.setFullYear(2019);
        seasonStart.setMonth(7);
        seasonStart.setDate(5);

        this._seasonStart = seasonStart;
    }

    _get_week() {
        const today = new Date();
        let week = 0;
        while (today >= this._seasonStart) {
            week += 1;
            today.setDate(today.getDate() - 7);
        }
        return week;
    }

    _updateUrl() {
        const now = new Date();
        const week = this._get_week();
        if (week === 0 || week > 16)
            throw new TypeError("There are no NFL games this week");

        this.schedule_url = NFL_SCHEDULE_URL.format(now.getFullYear(), week);
        this.standings_url = NFL_STANDINGS_URL.format(now.getFullYear());
    }

    _createTpEntity(team) {
        return new Tp.Value.Entity(team.alias.toLowerCase(), team.name);
    }

    get_get_weekly_games() {
        this._updateUrl();
        return Tp.Helpers.Http.get(this.schedule_url)
            .then((response) => {
                const parsed = JSON.parse(response);
                const game_statuses = [];

                const games = parsed.week.games;
                for (let i = 0; i < games.length; i++) {
                    const game_status = {
                        home_team: this._createTpEntity(games[i].home),
                        home_score: games[i].scoring.home_points,
                        away_team: this._createTpEntity(games[i].away),
                        away_score: games[i].scoring.away_points,
                        status: games[i].status,
                    };

                    game_statuses.push(game_status);
                }

                return game_statuses.map((game_status) => {
                    return game_status;
                });
            })
            .catch((e) => {
                throw new TypeError("No NFL Games Found");
            });
    }

    get_get_team(team) {
        this._updateUrl();

        return Tp.Helpers.Http.get(this.schedule_url)
            .then((response) => {
                const parsed = JSON.parse(response);
                const games = parsed.week.games;
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
                const awayTeam = games[index].away.name;
                const homeTeam = games[index].home.name;
                const awayPoints = games[index].scoring.away_points;
                const homePoints = games[index].scoring.home_points;
                const dateTime = new Date(scheduledTime);
                let status_message;
                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        this.get_rankings(team_name).then((response) => {
                            const team_rankings = response;
                            switch (gameStatus) {
                                case undefined:
                                    status_message = "There is no %s game today. I can notify you when there is a game if you want?".format(
                                        full_name.toUpperCase()
                                    );
                                    resolve([
                                        {
                                            result: status_message,
                                            divisionPos: team_rankings.division,
                                            divisionName:
                                                team_rankings.divisionName,
                                            conferencePos:
                                                team_rankings.conference,
                                            conferenceName:
                                                team_rankings.conferenceName,
                                        },
                                    ]);

                                    return;
                                case "scheduled":
                                    status_message = "Next game is %s @ %s at %s".format(
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
                                            divisionPos: team_rankings.division,
                                            divisionName:
                                                team_rankings.divisionName,
                                            conferencePos:
                                                team_rankings.conference,
                                            conferenceName:
                                                team_rankings.conferenceName,
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
                                            divisionPos: team_rankings.division,
                                            divisionName:
                                                team_rankings.divisionName,
                                            conferencePos:
                                                team_rankings.conference,
                                            conferenceName:
                                                team_rankings.conferenceName,
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
                                            divisionPos: team_rankings.division,
                                            divisionName:
                                                team_rankings.divisionName,
                                            conferencePos:
                                                team_rankings.conference,
                                            conferenceName:
                                                team_rankings.conferenceName,
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
                                            divisionPos: team_rankings.division,
                                            divisionName:
                                                team_rankings.divisionName,
                                            conferencePos:
                                                team_rankings.conference,
                                            conferenceName:
                                                team_rankings.conferenceName,
                                        },
                                    ]);

                                    return;

                                case "flex-schedule":
                                    status_message = "The game scheduled has not been finalized yet. For now, the next game is %s @ %s at %s".format(
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
                                            divisionPos: team_rankings.division,
                                            divisionName:
                                                team_rankings.divisionName,
                                            conferencePos:
                                                team_rankings.conference,
                                            conferenceName:
                                                team_rankings.conferenceName,
                                        },
                                    ]);

                                    return;
                            }

                            const status = this.statusConditions(gameStatus);
                            status[0].divisionPos = team_rankings.division;
                            status[0].divisionName = team_rankings.divisionName;
                            status[0].conferencePos = team_rankings.conference;
                            status[0].conferenceName =
                                team_rankings.conferenceName;

                            resolve(status);
                        });
                    }, 1000);
                });
            })
            .catch((e) => {
                throw new TypeError("No NFL Games Found");
            });
    }

    get_rankings(input_team) {
        this._updateUrl();

        return Tp.Helpers.Http.get(this.standings_url)
            .then((response) => {
                const parsed = JSON.parse(response);
                const conferences = parsed.conferences;
                for (const conference of conferences) {
                    const divisions = conference.divisions;
                    for (const division of divisions) {
                        const teams = division.teams;
                        for (const team of teams) {
                            const team_name = team.alias.toLowerCase();

                            if (team_name === input_team) {
                                const rankingObj = team.rank;

                                rankingObj.divisionName = division.name;
                                rankingObj.conferenceName = conference.name;

                                return rankingObj;
                            }
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
        this._updateUrl();
        return Tp.Helpers.Http.get(this.schedule_url)
            .then((response) => {
                const parsed = JSON.parse(response);
                const games = parsed.week.games;
                const team_name = team.team.value;
                const full_name = team.team.display;
                let index = 0;
                let gameStatus;
                let gameId;
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
                const homeScore = games[index].scoring.home_points;
                const awayScore = games[index].scoring.away_points;
                const scheduledTime = games[index].scheduled;
                const dateTime = new Date(scheduledTime);

                switch (gameStatus) {
                    case undefined:
                        return [
                            {
                                status_message: "There is no %s game today. I can notify you when there is a game if you want?".format(
                                    full_name.toUpperCase()
                                ),
                            },
                        ];
                    case "scheduled":
                        return [
                            {
                                status_message: "Next game is %s @ %s at %s".format(
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
                            const url = NFL_BOXSCORE_URL.format(gameId);
                            setTimeout(() => {
                                Tp.Helpers.Http.get(url).then((response) => {
                                    const parsed = JSON.parse(response);
                                    const homeQuarters = [];
                                    const awayQuarters = [];

                                    for (let i = 0; i < 4; i++) {
                                        try {
                                            homeQuarters.push(
                                                parsed.scoring[i].home_points
                                            );
                                            awayQuarters.push(
                                                parsed.scoring[i].away_points
                                            );
                                        } catch (error) {
                                            homeQuarters.push(0);
                                            awayQuarters.push(0);
                                        }
                                    }

                                    const box_score = [
                                        {
                                            home_team: this._createTpEntity(
                                                homeTeam
                                            ),
                                            home_score: homeScore,
                                            home_quarter1: homeQuarters[0],
                                            home_quarter2: homeQuarters[1],
                                            home_quarter3: homeQuarters[2],
                                            home_quarter4: homeQuarters[3],
                                            away_team: this._createTpEntity(
                                                awayTeam
                                            ),
                                            away_score: awayScore,
                                            away_quarter1: awayQuarters[0],
                                            away_quarter2: awayQuarters[1],
                                            away_quarter3: awayQuarters[2],
                                            away_quarter4: awayQuarters[3],
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
                throw new TypeError("No NFL Games Found");
            });
    }

    get_get_roster(team) {
        this._updateUrl();
        const team_name = team.team.value;
        const nfl_info = NFL_JSON;
        const conferences = nfl_info.conferences;
        for (const conference of conferences) {
            const divisions = conference.divisions;
            for (const division of divisions) {
                const teams = division.teams;
                for (const team of teams) {
                    const name = team.alias.toLowerCase();
                    if (name === team_name) {
                        return Tp.Helpers.Http.get(
                            NFL_ROSTER_URL.format(team.id)
                        ).then((response) => {
                            const parsed = JSON.parse(response);
                            const team_members = [];

                            const players = parsed.players;
                            const coaches = parsed.coaches;

                            for (const player of players) {
                                {
                                    team_members.push({
                                        member:
                                            player.position +
                                            ": " +
                                            player.name,
                                    });
                                }
                            }

                            const sortedRoster = team_members.sort((a, b) => {
                                return a.member.localeCompare(b.member);
                            });

                            for (const coach of coaches) {
                                if (coach.position === "Head Coach") {
                                    const head_coach = coach.full_name;
                                    sortedRoster.push({
                                        member: "Head Coach: " + head_coach,
                                    });
                                }
                            }
                            return sortedRoster;
                        });
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
        }

        return [];
    }
};
