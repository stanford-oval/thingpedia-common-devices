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

const MLB_API_KEY = "76qzdw27b4nm58f38ck7hkqu";
const MLB_SCHEDULE_URL =
    "https://api.sportradar.us/mlb/trial/v6.5/en/games/%d/%d/%d/boxscore.json?api_key=" +
    MLB_API_KEY;
const MLB_BOXSCORE_URL =
    "https://api.sportradar.us/mlb/trial/v6.5/en/games/%s/boxscore.json?api_key=" +
    MLB_API_KEY;
const MLB_RANKINGS_URL =
    "https://api.sportradar.us/mlb/trial/v6.5/en/seasons/%d/REG/rankings.json?api_key=" +
    MLB_API_KEY;
const MLB_ROSTER_URL =
    "https://api.sportradar.us/mlb/trial/v6.5/en/teams/%s/depth_chart.json?api_key=" +
    MLB_API_KEY;
const MLB_JSON = require("./teams/mlb.json");

module.exports = class MLBSportRadarAPIDevice {
    constructor(platform) {
        this.platform = platform;
        this.name = "Sport Radar MLB Channel";
        this.description = "The MLB Channel for Sport Radar";
    }

    _updateUrl() {
        const now = new Date();
        this.schedule_url = MLB_SCHEDULE_URL.format(
            now.getFullYear(),
            now.getMonth() + 1,
            now.getDate()
        );
        this.rankings_url = MLB_RANKINGS_URL.format(now.getFullYear());
    }

    _createTpEntity(team) {
        return new Tp.Value.Entity(team.abbr.toLowerCase(), team.name);
    }

    get_get_todays_games() {
        this._updateUrl();
        return Tp.Helpers.Http.get(this.schedule_url)
            .then((response) => {
                const parsed = JSON.parse(response);
                const game_statuses = [];
                const games = parsed.league.games;

                for (let i = 0; i < games.length; i++) {
                    const game_status = {
                        home_team: this._createTpEntity(games[i].game.home),
                        home_score: games[i].game.home.runs,
                        away_team: this._createTpEntity(games[i].game.away),
                        away_score: games[i].game.away.runs,
                        result: games[i].game.status,
                    };

                    game_statuses.push(game_status);
                }

                return game_statuses.map((game_status) => {
                    return game_status;
                });
            })
            .catch((e) => {
                throw new TypeError("No MLB Games Found");
            });
    }

    get_get_team(team) {
        this._updateUrl();
        const team_name = team.team.value;
        const full_name = team.team.display;

        return Tp.Helpers.Http.get(this.schedule_url)
            .then((response) => {
                const parsed = JSON.parse(response);
                const games = parsed.league.games;
                let gameStatus;
                let index = 0;
                const platform = this.platform;
                let status_message;

                for (let i = 0; i < games.length; i++) {
                    if (
                        games[i].game.home.abbr.toLowerCase() === team_name ||
                        games[i].game.away.abbr.toLowerCase() === team_name
                    ) {
                        index = i;
                        gameStatus = games[i].game.status;

                        break;
                    }
                }

                const scheduledTime = games[index].game.scheduled;
                const awayTeam = games[index].game.away.name;
                const homeTeam = games[index].game.home.name;
                const awayPoints = games[index].game.away.runs;
                const homePoints = games[index].game.home.runs;

                const dateTime = new Date(scheduledTime);

                return new Promise((resolve, reject) => {
                    setTimeout(() => {
                        this.get_rankings(team_name).then((response) => {
                            const team_rankings = response;

                            switch (gameStatus) {
                                case undefined:
                                    status_message = "There is no %s game today. I can notify you when there is a game if you want?".format(
                                        full_name
                                    );
                                    resolve([
                                        {
                                            result: status_message,
                                            divisionPos: team_rankings.division,
                                            divisionName:
                                                team_rankings.divisionName,
                                            leaguePos: team_rankings.league,
                                            leagueName:
                                                team_rankings.leagueName,
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
                                            divisionPos: team_rankings.division,
                                            divisionName:
                                                team_rankings.divisionName,
                                            leaguePos: team_rankings.league,
                                            leagueName:
                                                team_rankings.leagueName,
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
                                            leaguePos: team_rankings.league,
                                            leagueName:
                                                team_rankings.leagueName,
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
                                            leaguePos: team_rankings.league,
                                            leagueName:
                                                team_rankings.leagueName,
                                        },
                                    ]);

                                    return;
                            }

                            const status = this.statusConditions(gameStatus);
                            status[0].divisionPos = team_rankings.division;
                            status[0].divisionName = team_rankings.divisionName;
                            status[0].leaguePos = team_rankings.league;
                            status[0].leagueName = team_rankings.leagueName;

                            resolve(status);
                        });
                    }, 1000);
                });
            })
            .catch((e) => {
                throw new TypeError("No MLB Games Found");
            });
    }

    get_rankings(input_team) {
        this._updateUrl();

        return Tp.Helpers.Http.get(this.rankings_url)
            .then((response) => {
                const parsed = JSON.parse(response);
                const leagues = parsed.league.season.leagues;
                for (const league of leagues) {
                    const divisions = league.divisions;
                    for (const division of divisions) {
                        const teams = division.teams;

                        for (const team of teams) {
                            const team_name = team.abbr.toLowerCase();

                            if (team_name === input_team) {
                                const rankingObj = team.rank;
                                rankingObj.divisionName = division.name;
                                rankingObj.leagueName = league.name;

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
        const team_name = team.team.value;
        const full_name = team.team.display;

        return Tp.Helpers.Http.get(this.schedule_url)
            .then((response) => {
                const parsed = JSON.parse(response);
                const games = parsed.league.games;
                let index = 0;
                let gameStatus;
                let gameId;
                const platform = this.platform;

                for (let i = 0; i < games.length; i++) {
                    if (
                        games[i].game.home.abbr.toLowerCase() === team_name ||
                        games[i].game.away.abbr.toLowerCase() === team_name
                    ) {
                        index = i;
                        gameStatus = games[i].game.status;
                        gameId = games[i].game.id;
                    }
                }

                const homeTeam = games[index].game.home;
                const awayTeam = games[index].game.away;
                const homeScore = games[index].game.home.runs;
                const awayScore = games[index].game.away.runs;
                const scheduledTime = games[index].game.scheduled;
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
                                    awayTeam,
                                    homeTeam.name,
                                    dateTime.toLocaleString(platform.locale, {
                                        timeZone: platform.timezone,
                                    })
                                ),
                            },
                        ];
                    case "closed":
                    case "inprogress":
                        return new Promise((resolve, reject) => {
                            setTimeout(() => {
                                const url = MLB_BOXSCORE_URL.format(gameId);
                                return Tp.Helpers.Http.get(url).then(
                                    (response) => {
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

                                        const box_score = [
                                            {
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
                                                    awayTeam
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
                                                status_message:
                                                    "Game Status: " +
                                                    gameStatus,
                                            },
                                        ];

                                        resolve(box_score);
                                    }
                                );
                            }, 1000);
                        });
                }
                return this.statusConditions(gameStatus);
            })
            .catch((e) => {
                throw new TypeError("No MLB Games Found");
            });
    }

    get_get_roster(team) {
        this._updateUrl();
        const team_name = team.team.value;
        const mlb_info = MLB_JSON;
        const leagues = mlb_info.leagues;
        for (const league of leagues) {
            const divisions = league.divisions;
            for (const division of divisions) {
                const teams = division.teams;
                for (const team of teams) {
                    const name = team.abbr.toLowerCase();
                    if (name === team_name) {
                        return Tp.Helpers.Http.get(
                            MLB_ROSTER_URL.format(team.id)
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
                                            {
                                                team_members.push({
                                                    player:
                                                        position_name +
                                                        ": " +
                                                        player_name,
                                                });
                                            }
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
                                            player:
                                                `SP${i + 1}: ` + player_name,
                                        });
                                    }
                                }
                            }

                            const sortedRoster = team_members.sort((a, b) => {
                                return a.player.localeCompare(b.player);
                            });
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
            case "complete":
                status_message =
                    "The game is complete and statistics are being reviewed";
                return [
                    {
                        result: status_message,
                    },
                ];
            case "wdelay":
                status_message = "The game has been delayed because of weather";
                return [
                    {
                        result: status_message,
                    },
                ];
            case "fdelay":
                status_message =
                    "The game has been delayed because of facility issues";
                return [
                    {
                        result: status_message,
                    },
                ];
            case "odelay":
                status_message = "The game has been delayed";
                return [
                    {
                        result: status_message,
                    },
                ];
            case "canceled":
                status_message = "The game has been canceled";
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

            case "suspended":
                status_message = "The game has been suspended";
                return [
                    {
                        result: status_message,
                    },
                ];

            case "maintenance":
                status_message = "The game failed review and is being repaired";
                return [
                    {
                        result: status_message,
                    },
                ];
        }
        return [];
    }
};
