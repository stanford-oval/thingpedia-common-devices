"use strict";

const Tp = require("thingpedia");

const SOCCER_EU_API_KEY = "bqusuccn5zubfc4m6p9sspr2";
const SOCCER_EU_SCHEDULE_URL =
  "http://api.sportradar.us/soccer-t3/eu/en/schedules/%s/schedule.json?api_key=" +
  SOCCER_EU_API_KEY;
const SOCCER_EU_LIVE_URL =
  "http://api.sportradar.us/soccer-t3/eu/en/schedules/live/results.json?api_key=" +
  SOCCER_EU_API_KEY;
const SOCCER_EU_CLOSED_URL =
  "http://api.sportradar.us/soccer-t3/eu/en/schedules/%s/results.json?api_key=" +
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

  get_get_todays_games() {
    this._updateUrl();

    return Tp.Helpers.Http.get(SOCCER_EU_SCHEDULE_URL.format(this.date_url))
      .then((response) => {
        const parsed = JSON.parse(response);
        var game_statuses = [];

        const games = parsed["sport_events"];
        for (var i = 0; i < games.length; i++) {
          let game_status = {
            home_team: games[i]["competitors"][0]["name"],
            away_team: games[i]["competitors"][1]["name"],
            tournament: games[i]["tournament"]["name"],
            result: games[i]["status"]
          };

          game_statuses.push(game_status);
        }

        return game_statuses.map((game_status) => {
          return {
            home_team: game_status.home_team,
            away_team: game_status.away_team,
            tournament: game_status.tournament,
            status: game_status.result
          };
        });
      })
      .catch((e) => {
        throw new TypeError("No EU Soccer Games Today");
      });
  }

  get_live_results(team) {
    return Tp.Helpers.Http.get(SOCCER_EU_LIVE_URL).then((response) => {
      const parsed = JSON.parse(response);
      const games = parsed["results"];

      var index = 0;
      for (var i = 0; i < games.length; i++) {
        if (
          games[i]["sport_event"]["competitors"][0][
            "abbreviation"
          ].toLowerCase() === team ||
          games[i]["sport_event"]["competitors"][1][
            "abbreviation"
          ].toLowerCase() === team
        )
          index = i;
      }
      const homePoints = games[index]["sport_event_status"]["home_score"];
      const awayPoints = games[index]["sport_event_status"]["home_score"];
      const awayName = games[index]["sport_event"]["competitors"][1]["name"];
      const homeName = games[index]["sport_event"]["competitors"][0]["name"];
      const homeHalf1 =
        games[index]["sport_event_status"]["period_scores"][0]["home_score"];
      const homeHalf2 =
        games[index]["sport_event_status"]["period_scores"][1]["home_score"];
      const awayHalf1 =
        games[index]["sport_event_status"]["period_scores"][0]["away_score"];
      const awayHalf2 =
        games[index]["sport_event_status"]["period_scores"][1]["away_score"];
      const matchTime =
        games[index]["sport_event_status"]["clock"]["match_time"];

      let box_score = [
        {
          home_team: homeName,
          home_score: homePoints,
          home_half1: homeHalf1,
          home_half2: homeHalf2,
          away_team: awayName,
          away_score: awayPoints,
          away_half1: awayHalf1,
          away_half2: awayHalf2,
          match_status: "Clock: " + matchTime
        }
      ];

      return box_score;
    });
  }

  get_closed_results(team) {
    return Tp.Helpers.Http.get(SOCCER_EU_CLOSED_URL.format(this.date_url)).then(
      (response) => {
        const parsed = JSON.parse(response);
        const games = parsed["results"];

        var index = 0;
        for (var i = 0; i < games.length; i++) {
          if (
            games[i]["sport_event"]["competitors"][0][
              "abbreviation"
            ].toLowerCase() === team ||
            games[i]["sport_event"]["competitors"][1][
              "abbreviation"
            ].toLowerCase() === team
          )
            index = i;
        }
        const homePoints = games[index]["sport_event_status"]["home_score"];
        const awayPoints = games[index]["sport_event_status"]["away_score"];
        const awayName = games[index]["sport_event"]["competitors"][1]["name"];
        const homeName = games[index]["sport_event"]["competitors"][0]["name"];
        const homeHalf1 =
          games[index]["sport_event_status"]["period_scores"][0]["home_score"];
        const homeHalf2 =
          games[index]["sport_event_status"]["period_scores"][1]["home_score"];
        const awayHalf1 =
          games[index]["sport_event_status"]["period_scores"][0]["away_score"];
        const awayHalf2 =
          games[index]["sport_event_status"]["period_scores"][1]["away_score"];

        let box_score = [
          {
            home_team: homeName,
            home_score: homePoints,
            home_half1: homeHalf1,
            home_half2: homeHalf2,
            away_team: awayName,
            away_score: awayPoints,
            away_half1: awayHalf1,
            away_half2: awayHalf2,
            match_status: "Game Status: Closed"
          }
        ];

        return box_score;
      }
    );
  }

  get_get_team(team) {
    this._updateUrl();
    return Tp.Helpers.Http.get(SOCCER_EU_SCHEDULE_URL.format(this.date_url))
      .then((response) => {
        const parsed = JSON.parse(response);

        const games = parsed["sport_events"];
        const team_name = team["team"];
        var index = 0;
        var gameStatus = "nogame";
        const self = this;
        const platform = this.platform;

        for (var i = 0; i < games.length; i++) {
          if (
            games[i]["competitors"][0]["abbreviation"].toLowerCase() ===
              team_name ||
            games[i]["competitors"][1]["abbreviation"].toLowerCase() ===
              team_name
          ) {
            index = i;
            gameStatus = games[i]["status"];
          }
        }

        switch (gameStatus) {
          case "nogame":
            return [
              {
                status_message: "There is no %s game today. I can notify you when there is a game if you want?".format(
                  team_name
                )
              }
            ];

          case "not_started":
            var scheduledTime = games[index]["scheduled"];
            var localTime = scheduledTime.toLocaleString(platform.locale, {
              timeZone: platform.timezone
            });

            return [
              {
                status_message: "This game is scheduled for %s".format(
                  localTime
                )
              }
            ];

          case "live":
            return new Promise((resolve, reject) => {
              setTimeout(() => {
                self.get_live_results().then((response) => {
                  resolve(response);
                });
              }, 1000);
            });

          case "closed":
            return new Promise((resolve, reject) => {
              setTimeout(() => {
                self.get_closed_results(team_name).then((response) => {
                  resolve(response);
                });
              }, 1000);
            });
        }

        return this.statusConditions(gameStatus);
      })
      .catch((e) => {
        throw new TypeError("No EU Soccer Games Today");
      });
  }

  statusConditions(gameStatus) {
    var status_message;
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

      case "if_necessary":
        status_message = "The game will be scheduled if necessary";
        return [
          {
            result: status_message
          }
        ];

      case "start_delayed-":
        status_message = "The start of this match has been delayed";
        return [
          {
            result: status_message
          }
        ];

      case "abandoned":
        status_message = "The game has been abandoned";
        return [
          {
            result: status_message
          }
        ];
    }

    return [];
  }
};
