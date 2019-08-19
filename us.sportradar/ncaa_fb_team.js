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

const NCAA_FB_API_KEY = "2scv4ydgppgrc2kry66t8rhe";
const NCAA_FB_SCHEDULE_URL =
    "https://api.sportradar.us/ncaafb-t1/%d/REG/%d/schedule.json?api_key=" +
    NCAA_FB_API_KEY;
const NCAA_FB_BOXSCORE_URL =
    "https://api.sportradar.us/ncaafb-t1/%d/REG/%d/%s/%s/boxscore.json?api_key=" +
    NCAA_FB_API_KEY;
const NCAA_FB_STANDINGS_URL =
    "https://api.sportradar.us/ncaafb-t1/teams/FBS/%s/REG/standings.json?api_key=" +
    NCAA_FB_API_KEY;
const NCAA_FB_ROSTER_URL =
    "https://api.sportradar.us//ncaafb-t1/teams/%s/roster.json?api_key=" +
    NCAA_FB_API_KEY;

module.exports = class NCAAFBSportRadarAPIDevice {
    constructor(platform) {
        this.platform = platform;
        this.name = "Sport Radar NCAA Football Channel";
        this.description = "The NCAA Football Channel for Sport Radar";

        const seasonStart = new Date();
        seasonStart.setFullYear(2019);
        seasonStart.setMonth(7);
        seasonStart.setDate(24);

        this._seasonStart = seasonStart;
        //week one is longer than the other weeks
        this._weekOneLength = 13;
    }

    _get_week() {
        const today = new Date();
        let week = 0;
        let isWeekOne = true;
        while (today >= this._seasonStart) {
            week += 1;
            if (isWeekOne) {
                today.setDate(today.getDate() - this._weekOneLength);
                isWeekOne = false;
            } else {
                today.setDate(today.getDate() - 7);
            }
        }

        return week;
    }

    _updateUrl() {
        const now = new Date();
        const week = this._get_week();
        console.log(week);

        if (week === 0 || week > 16)
            throw new TypeError("There are no NCAA Football games this week");

        this.schedule_url = NCAA_FB_SCHEDULE_URL.format(
            now.getFullYear(),
            week
        );

        this.standings_url = NCAA_FB_STANDINGS_URL.format(now.getFullYear());
        this._week = week;
    }

    get_get_weekly_games() {
        this._updateUrl();
        return Tp.Helpers.Http.get(this.schedule_url)
            .then((response) => {
                const parsed = JSON.parse(response);
                const game_statuses = [];

                const games = parsed.games;
                console.log(games);
                for (let i = 0; i < games.length; i++) {
                    const game_status = {
                        home_team: games[i].home,
                        home_score: games[i].home_points,
                        away_team: games[i].away,
                        away_score: games[i].away_points,
                        result: games[i].status,
                    };

                    game_statuses.push(game_status);
                }

                return game_statuses.map((game_status) => {
                    return {
                        home_team: game_status.home_team,
                        home_score: game_status.home_score,
                        away_team: game_status.away_team,
                        away_score: game_status.away_score,
                        status: game_status.result,
                    };
                });
            })
            .catch((e) => {
                throw new TypeError("No NCAA Football Games This Week");
            });
    }

    get_get_team(team) {
        this._updateUrl();

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
                        games[i].home.toLowerCase() === team_name ||
                        games[i].away.toLowerCase() === team_name
                    ) {
                        index = i;
                        gameStatus = games[i].status;
                    }
                }
                const scheduledTime = games[index].scheduled;
                const awayTeam = games[index].away;
                const homeTeam = games[index].home;
                const awayPoints = games[index].away_points;
                const homePoints = games[index].home_points;
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
                                            wins: team_rankings.wins,
                                            losses: team_rankings.losses,
                                            conferenceName:
                                                team_rankings.conference,
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
                                            wins: team_rankings.wins,
                                            losses: team_rankings.losses,
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
                                            conferenceName:
                                                team_rankings.conference,
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
                                            wins: team_rankings.wins,
                                            losses: team_rankings.losses,
                                            conferenceName:
                                                team_rankings.conference,
                                        },
                                    ]);

                                    return;
                            }

                            const status = this.statusConditions(gameStatus);
                            status[0].wins = team_rankings.wins;
                            status[0].losses = team_rankings.losses;
                            status[0].conferenceName = team_rankings.conference;

                            resolve(status);
                        });
                    }, 1000);
                });
            })
            .catch((e) => {
                throw new TypeError("No NCAA Football Games This Week");
            });
    }

    get_rankings(input_team) {
        this._updateUrl();

        return Tp.Helpers.Http.get(this.standings_url)
            .then((response) => {
                const parsed = JSON.parse(response);
                const conferences = parsed.division.conferences;
                for (const conference of conferences) {
                    const teams = conference.teams;
                    for (const team of teams) {
                        const team_id = team.id.toLowerCase();
                        if (team_id === input_team) {
                            return {
                                conference: conference.name,
                                wins: team.overall.wins,
                                losses: team.overall.losses,
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
        this._updateUrl();
        return Tp.Helpers.Http.get(this.schedule_url)
            .then((response) => {
                const parsed = JSON.parse(response);
                const games = parsed.games;
                const team_name = team.team.value;
                const full_name = team.team.display;
                let index = 0;
                let gameStatus;
                const platform = this.platform;

                for (let i = 0; i < games.length; i++) {
                    if (
                        games[i].home.toLowerCase() === team_name ||
                        games[i].away.toLowerCase() === team_name
                    ) {
                        index = i;
                        gameStatus = games[i].status;
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
                                    full_name.toUpperCase()
                                ),
                            },
                        ];
                    case "scheduled":
                        return [
                            {
                                status_message: "Next game is %s @ %s at %s".format(
                                    awayTeam,
                                    homeTeam,
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
                            const now = new Date();
                            const url = NCAA_FB_BOXSCORE_URL.format(
                                now.getFullYear(),
                                this._week,
                                awayTeam,
                                homeTeam
                            );
                            console.log(url);
                            setTimeout(() => {
                                Tp.Helpers.Http.get(url).then((response) => {
                                    const parsed = JSON.parse(response);
                                    const homeQuarters = [];
                                    const awayQuarters = [];

                                    for (let i = 0; i < 4; i++) {
                                        try {
                                            homeQuarters.push(
                                                parsed.home_team.scoring[i]
                                                    .points
                                            );
                                            awayQuarters.push(
                                                parsed.away_team.scoring[i]
                                                    .points
                                            );
                                        } catch (error) {
                                            homeQuarters.push(0);
                                            awayQuarters.push(0);
                                        }
                                    }

                                    const box_score = [
                                        {
                                            home_team: homeTeam,
                                            home_score: homeScore,
                                            home_quarter1: homeQuarters[0],
                                            home_quarter2: homeQuarters[1],
                                            home_quarter3: homeQuarters[2],
                                            home_quarter4: homeQuarters[3],
                                            away_team: awayTeam,
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
                throw new TypeError("No NCAA Football Games This Week");
            });
    }

    get_get_roster(team) {
        this._updateUrl();
        const team_name = team.team.value;

        return Tp.Helpers.Http.get(NCAA_FB_ROSTER_URL.format(team_name))
            .then((response) => {
                const parsed = JSON.parse(response);
                const team_members = [];

                const players = parsed.players;
                const coaches = parsed.coaches;

                for (const player of players) {
                    {
                        team_members.push({
                            member: player.position + ": " + player.name_full,
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
                            member: "Head Coach: " + head_coach,
                        });
                    }
                }
                return sortedRoster;
            })
            .catch((e) => {
                throw new TypeError("Invalid Team Input");
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
