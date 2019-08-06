"use strict";

const Tp = require("thingpedia");

const NFL_API_KEY = "ru7baq9u5x3b4wh3q4g6p5qs";
const NFL_SCHEDULE_URL =
  "http://api.sportradar.us/nfl/official/trial/v5/en/games/%d/reg/%d/schedule.json?api_key=" +
  NFL_API_KEY;
const NFL_BOXSCORE_URL =
  "http://api.sportradar.us/nfl/official/trial/v5/en/games/%s/boxscore.json?api_key=" +
  NFL_API_KEY;

module.exports = class NFLSportRadarAPIDevice {
  constructor(platform) {
    this.platform = platform;
    this.name = "Sport Radar NFL Channel";
    this.description = "The NFL Channel for Sport Radar";
    const seasonStart = new Date();

    seasonStart.setFullYear(2019);
    seasonStart.setMonth(8);
    seasonStart.setDate(5);

    this._seasonStart = seasonStart;
  }

  get_week() {
    const today = new Date();
    let week = 0;
    while (this.compare_dates(today, this._seasonStart)) {
      week += 1;
      today.setDate(today.getDate() - 7);
    }
    return week;
  }

  compare_dates(date1, date2) {
    if (date1.getFullYear() > date2.getFullYear()) return true;
    else if (date1.getFullYear() < date2.getFullYear()) return false;
    else if (date1.getMonth() > date2.getMonth()) return true;
    else if (date1.getMonth() < date2.getMonth()) return false;
    else if (date1.getDate() >= date1.getDate()) return true;
    else return false;
  }

  _updateUrl() {
    //const now = new Date();
    //const week = this.get_week();
    // if (week == 0 || week > 16){
    //   throw new TypeError("The NFL regular season is over");
    // }

    this.url = NFL_SCHEDULE_URL.format(2018, 1);
    //console.log('url', this.url);
  }

  get_get_weekly_games() {
    this._updateUrl();
    return Tp.Helpers.Http.get(this.url)
      .then((response) => {
        const parsed = JSON.parse(response);
        const game_statuses = [];

        const games = parsed.week.games;
        for (let i = 0; i < games.length; i++) {
          const game_status = {
            home_team: games[i].home.alias,
            home_score: games[i].scoring.home_points,
            away_team: games[i].away.alias,
            away_score: games[i].scoring.away_points,
            result: games[i].status
          };

          game_statuses.push(game_status);
        }

        return game_statuses.map((game_status) => {
          return {
            home_team: game_status.home_team,
            home_score: game_status.home_score,
            away_team: game_status.away_team,
            away_score: game_status.away_score,
            status: game_status.result
          };
        });
      })
      .catch((e) => {
        throw new TypeError("No NFL Games This Week");
      });
  }

  get_get_team(team) {
    this._updateUrl();
    return Tp.Helpers.Http.get(this.url)
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
        const awayName = games[index].away.alias;
        const homeName = games[index].home.alias;
        const awayPoints = games[index].scoring.away_points;
        const homePoints = games[index].scoring.home_points;
        const dateTime = new Date(scheduledTime);
        let status_message;

        switch (gameStatus) {
          case undefined:
            status_message = "There is no %s game today. I can notify you when there is a game if you want?".format(
              full_name.toUpperCase()
            );
            return [
              {
                result: status_message
              }
            ];
          case "scheduled":
            status_message = "Next game is %s @ %s at %s".format(
              awayName,
              homeName,
              dateTime.toLocaleString(platform.locale, {
                timeZone: platform.timezone
              })
            );
            return [
              {
                result: status_message
              }
            ];

          case "inprogress":
            status_message = "Game update for %s @ %s: %d - %d".format(
              awayName,
              homeName,
              awayPoints,
              homePoints
            );
            return [
              {
                result: status_message
              }
            ];

          case "halftime":
            status_message = "Half-time for %s @ %s: %d - %d".format(
              awayName,
              homeName,
              awayPoints,
              homePoints
            );
            return [
              {
                result: status_message
              }
            ];

          case "closed":
            status_message = "Final score for %s @ %s: %d - %d".format(
              awayName,
              homeName,
              awayPoints,
              homePoints
            );
            return [
              {
                result: status_message
              }
            ];

          case "flex-schedule":
            status_message = "The game scheduled has not been finalized yet. For now, the next game is %s @ %s at %s".format(
              awayName,
              homeName,
              dateTime.toLocaleString(platform.locale, {
                timeZone: platform.timezone
              })
            );
            return [
              {
                result: status_message
              }
            ];
        }

        return this.statusConditions(gameStatus);
      })
      .catch((e) => {
        throw new TypeError("No NFL Games This Week");
      });
  }

  get_get_boxscore(team) {
    this._updateUrl();
    return Tp.Helpers.Http.get(this.url)
      .then((response) => {
        const parsed = JSON.parse(response);
        const games = parsed.week.games;
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

        const homeTeam = games[index].home.alias;
        const awayTeam = games[index].away.alias;
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
                )
              }
            ];
          case "scheduled":
            return [
              {
                status_message: "This game is scheduled for %s".format(
                  dateTime.toLocaleString(platform.locale, {
                    timeZone: platform.timezone
                  })
                )
              }
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
                      homeQuarters.push(parsed.scoring[i].home_points);
                      awayQuarters.push(parsed.scoring[i].away_points);
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
                      status_message: "Game Status: " + gameStatus
                    }
                  ];

                  resolve(box_score);
                });
              }, 1000);
            });
        }
        return this.statusConditions(gameStatus);
      })
      .catch((e) => {
        throw new TypeError("No NFL Games This Week");
      });
  }

  statusConditions(gameStatus) {
    let status_message;
    switch (gameStatus) {
      case "canceled":
        status_message = "The game has been canceled";
        return [
          {
            result: status_message
          }
        ];

      case "delayed":
        status_message = "The game has been delayed";
        return [
          {
            result: status_message
          }
        ];

      case "unnecessary":
        status_message =
          "The game was scheduled to occur, but is now deemed unnecessary";
        return [
          {
            result: status_message
          }
        ];

      case "postponed":
        status_message = "The game has been postponed";
        return [
          {
            result: status_message
          }
        ];

      case "time-tbd":
        status_message =
          "The game has been scheduled but the time has yet to be announced";
        return [
          {
            result: status_message
          }
        ];
    }

    return [];
  }
};
