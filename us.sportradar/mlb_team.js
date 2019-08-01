"use strict";

const Tp = require("thingpedia");

const MLB_API_KEY = "xzzvcwgkt6q8c2agt8qrnqs3";
const MLB_SCHEDULE_URL =
  "http://api.sportradar.us/mlb/trial/v6.5/en/games/%d/%d/%d/boxscore.json?api_key=" +
  MLB_API_KEY;
const MLB_BOXSCORE_URL =
  "http://api.sportradar.us/mlb/trial/v6.5/en/games/%s/boxscore.json?api_key=" +
  MLB_API_KEY;

module.exports = class MLBSportRadarAPIDevice {
  constructor(platform) {
    this.platform = platform;
    this.name = "Sport Radar MLB Channel";
    this.description = "The MLB Channel for Sport Radar";
  }

  _updateUrl() {
    var now = new Date();
    this.url = MLB_SCHEDULE_URL.format(
      now.getFullYear(),
      now.getMonth() + 1,
      now.getDate()
    );
  }

  get_get_todays_games() {
    this._updateUrl();
    return Tp.Helpers.Http.get(this.url)
      .then((response) => {
        const parsed = JSON.parse(response);
        var game_statuses = [];
        const games = parsed["league"]["games"];

        for (var i = 0; i < games.length; i++) {
          let game_status = {
            home_team: games[i]["game"]["home"]["abbr"],
            home_score: games[i]["game"]["home"]["runs"],
            away_team: games[i]["game"]["away"]["abbr"],
            away_score: games[i]["game"]["away"]["runs"],
            result: games[i]["game"]["status"]
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
        throw new TypeError("No MLB Games Today");
      });
  }

  get_get_team(team) {
    this._updateUrl();
    const team_name = team["team"];
    return Tp.Helpers.Http.get(this.url)
      .then((response) => {
        const parsed = JSON.parse(response);
        const games = parsed["league"]["games"];
        var gameStatus;
        var index = 0;
        const platform = this.platform;

        for (var i = 0; i < games.length; i++) {
          if (
            games[i]["game"]["home"]["abbr"].toLowerCase() === team_name ||
            games[i]["game"]["away"]["abbr"].toLowerCase() === team_name
          ) {
            index = i;
            gameStatus = games[i]["game"]["status"];
            if (gameStatus === "scheduled" || gameStatus === "inprogress")
              break;
          }
        }
        const scheduledTime = games[index]["game"]["scheduled"];
        const awayName = games[index]["game"]["away"]["abbr"];
        const homeName = games[index]["game"]["home"]["abbr"];
        const awayPoints = games[index]["game"]["away"]["runs"];
        const homePoints = games[index]["game"]["home"]["runs"];

        var status_message;

        switch (gameStatus) {
          case "scheduled":
            status_message = "Next game %s @ %s at %s".format(
              awayName,
              homeName,
              scheduledTime.toLocaleString(platform.locale, {
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
        }

        return this.statusConditions(gameStatus);
      })
      .catch((e) => {
        throw new TypeError(
          "No %s Games Today".format(team_name.toUpperCase())
        );
      });
  }

  get_get_boxscore(team) {
    this._updateUrl();
    const team_name = team["team"];
    return Tp.Helpers.Http.get(this.url)
      .then((response) => {
        const parsed = JSON.parse(response);
        const games = parsed["league"]["games"];
        var index = 0;
        var gameStatus = "nogame";
        var gameId;
        const platform = this.platform;

        for (var i = 0; i < games.length; i++) {
          if (
            games[i]["game"]["home"]["abbr"].toLowerCase() === team_name ||
            games[i]["game"]["away"]["abbr"].toLowerCase() === team_name
          ) {
            index = i;
            gameStatus = games[i]["game"]["status"];
            gameId = games[i]["game"]["id"];
          }
        }

        const homeTeam = games[index]["game"]["home"]["abbr"];
        const awayTeam = games[index]["game"]["away"]["abbr"];
        const homeScore = games[index]["game"]["home"]["runs"];
        const awayScore = games[index]["game"]["away"]["runs"];

        if (gameStatus === "nogame") {
          return [
            {
              status_message: "There is no %s game today. I can notify you when there is a game if you want?".format(
                team_name
              )
            }
          ];
        } else if (gameStatus === "scheduled") {
          const scheduledTime = games[index]["game"]["scheduled"];

          const localTime = scheduledTime.toLocaleString(platform.locale, {
            timeZone: platform.timezone
          });
          console.log(localTime);
          return [
            {
              status_message: "This game is scheduled for %s".format(localTime)
            }
          ];
        } else if (gameStatus === "closed" || gameStatus === "inprogress") {
          var promise = new Promise((resolve, reject) => {
            setTimeout(() => {
              const url = MLB_BOXSCORE_URL.format(gameId);
              return Tp.Helpers.Http.get(url).then((response) => {
                const parsed = JSON.parse(response);
                var homeInnings = [];
                var awayInnings = [];
                var homePitcher = "";
                var awayPitcher = "";

                for (var i = 0; i < 9; i++) {
                  try {
                    homeInnings.push(
                      parsed["game"]["home"]["scoring"][i]["runs"]
                    );
                    awayInnings.push(
                      parsed["game"]["away"]["scoring"][i]["runs"]
                    );
                  } catch (error) {
                    homeInnings.push(0);
                    awayInnings.push(0);
                  }
                }
                try {
                  homePitcher =
                    parsed["game"]["home"]["starting_pitcher"][
                      "preferred_name"
                    ] +
                    " " +
                    parsed["game"]["home"]["starting_pitcher"]["last_name"];
                  awayPitcher =
                    parsed["game"]["away"]["starting_pitcher"][
                      "preferred_name"
                    ] +
                    " " +
                    parsed["game"]["away"]["starting_pitcher"]["last_name"];
                } catch (error) {
                  console.log(error);
                }

                let box_score = [
                  {
                    home_team: homeTeam,
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
                    away_team: awayTeam,
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
                    status_message: "Game Status: " + gameStatus
                  }
                ];

                resolve(box_score);
              });
            }, 1000);
          });
          return promise;
        } else {
          return this.statusConditions(gameStatus);
        }
      })
      .catch((e) => {
        "No %s Games Today".format(team_name.toUpperCase());
      });
  }

  statusConditions(gameStatus) {
    var status_message;
    switch (gameStatus) {
      case "complete":
        status_message =
          "The game is complete and statistics are being reviewed";
        return [
          {
            result: status_message
          }
        ];
      case "wdelay":
        status_message = "The game has been delayed because of weather";
        return [
          {
            result: status_message
          }
        ];
      case "fdelay":
        status_message = "The game has been delayed because of facility issues";
        return [
          {
            result: status_message
          }
        ];
      case "odelay":
        status_message = "The game has been delayed";
        return [
          {
            result: status_message
          }
        ];
      case "canceled":
        status_message = "The game has been canceled";
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

      case "if_necessary":
        status_message = "The game will be scheduled if necessary";
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

      case "suspended":
        status_message = "The game has been suspended";
        return [
          {
            result: status_message
          }
        ];

      case "maintenance":
        status_message = "The game failed review and is being repaired";
        return [
          {
            result: status_message
          }
        ];
    }
    return [];
  }
};
