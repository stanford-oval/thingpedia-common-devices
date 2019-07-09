"use strict";

const Tp = require('thingpedia');

const NHL_API_KEY = 'w4j6fqyua2e45erjv4wfhxaw';
const NHL_SCHEDULE_URL = 'http://api.sportradar.us/nhl/trial/v6/en/games/%d/%d/%d/schedule.json?api_key=' + NHL_API_KEY;
const NHL_BOXSCORE_URL = 'http://api.sportradar.us/nhl/trial/v6/en/games/%s/boxscore.json?api_key=' + NHL_API_KEY;

module.exports = class NHLSportRadarAPIDevice {

  constructor(platform) {

        //super(platform);
        this.platform = platform
        this.name = "Sport Radar NHL Channel";
        this.description = "The NHL Channel for Sport Radar";

  }

  _updateUrl() {

        var now = new Date;
        this.url = NHL_SCHEDULE_URL.format(now.getFullYear(), now.getMonth() + 1, now.getDate());
        //console.log('url', this.url);
  }

  get_get_todays_games(){

    return Tp.Helpers.Http.get(NHL_SCHEDULE_URL.format(2019, 4, 2)).then((response) => {


        const parsed = JSON.parse(response);
        var game_statuses = [];

        const games = parsed['games'];
        for (var i = 0; i < games.length; i++){
          let game_status = {

            home_team: games[i]['home']['alias'],
            home_score: games[i]['home_points'],
            away_team: games[i]['away']['alias'],
            away_score: games[i]['away_points'],
            result: games[i]['status']

          };

          game_statuses.push(game_status)

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

  }).catch((e) => {
            console.error('Failed to process NHL game updates: ' + e.message);
            console.error(e.stack);
        });

  }

  get_get_team(team){

    return Tp.Helpers.Http.get(NHL_SCHEDULE_URL.format(2019, 4, 2)).then((response) => {

        const parsed = JSON.parse(response);
        const games = parsed['games'];
        var gameStatus = "nogame";
        var index = 0;
        const platform = this.platform;
        const team_name = team['team'];

        for (var i = 0; i < games.length; i++){
          if (games[i]['home']['alias'].toLowerCase() === team_name || games[i]['away']['alias'].toLowerCase() === team_name){
            index = i;
            gameStatus = games[i]['status'];
          }
        }
        const scheduledTime = games[index]['scheduled'];
        const awayName = games[index]['away']['alias'];
        const homeName = games[index]['home']['alias'];
        const awayPoints = games[index]['away_points'];
        const homePoints = games[index]['home_points'];


        switch(gameStatus) {
        case 'nogame':
            var status_message = "%s has no game today".format(team_name);
            return [{
              result: status_message
            }]
        case 'scheduled':
            var status_message = "Next game %s @ %s at %s".format(awayName, homeName, scheduledTime.toLocaleString(platform.locale, { timeZone: platform.timezone }));
            return [{
              result: status_message
            }]
        case 'inprogress':
            var status_message = "Game update for %s @ %s: %d - %d".format(awayName, homeName, awayPoints, homePoints);
            return [{
              result: status_message
            }]
        case 'halftime':
            var status_message = "Half-time for %s @ %s: %d - %d".format(awayName, homeName, awayPoints, homePoints);
            return [{
              result: status_message
            }]
        case 'complete':
            var status_message = "The game is complete and statistics are being reviewed"
            return [{
              result: status_message
            }]
        case 'closed':
            var status_message = "Final score for %s @ %s: %d - %d".format(awayName, homeName, awayPoints, homePoints);
            return [{
              result: status_message
            }]

        case 'canceled':
            var status_message = "The game has been canceled"
            return [{
              result: status_message
            }]

        case 'delayed':
            var status_message = "The game has been delayed"
            return [{
              result: status_message
            }]

        case 'unnecessary':
            var status_message = "The game was scheduled to occur, but is now deemed unnecessary"
            return [{
              result: status_message
            }]

        case 'if_necessary':
            var status_message = "The game will be scheduled if necessary"
            return [{
              result: status_message
            }]

        case 'postponed':
            var status_message = "The game has been postponed"
            return [{
              result: status_message
            }]

        case 'time-tbd':
            var status_message = "The game has been scheduled but the time has yet to be announced"
            return [{
              result: status_message
            }]

        case 'suspended':
            var status_message = "The game has been suspended"
            return [{
              result: status_message
            }]


        }

        return [];

    }).catch((e) => {
              console.error('Failed to process NBA game updates: ' + e.message);
              console.error(e.stack);
          });

  }

  get_get_boxscore(team){

    return Tp.Helpers.Http.get(NHL_SCHEDULE_URL.format(2019, 4, 2)).then((response) => {

      const parsed = JSON.parse(response);
      const games = parsed['games'];
      const teamName = team['team'];
      var index = 0;
      var gameStatus = "nogame"
      var gameId = "";
      const platform = this.platform;

      for (var i = 0; i < games.length; i++){

        if (games[i]['home']['alias'].toLowerCase() === teamName || games[i]['away']['alias'].toLowerCase() === teamName){

          index = i;
          gameStatus = games[i]['status'];
          gameId = games[i]['id'];

        }

      }

      const homeTeam = games[index]['home']['alias'];
      const awayTeam = games[index]['away']['alias'];
      const homeScore = games[index]['home_points'];
      const awayScore = games[index]['away_points'];

      if (gameStatus === "nogame"){
         return [{special_message: "There is no %s game today. I can notify you when there is a game if you want?".format(teamName)}];
      }

      if (gameStatus === "scheduled"){

         const scheduledTime = games[index]['scheduled'];
         const localTime = scheduledTime.toLocaleString(platform.locale, { timeZone: platform.timezone })
         return [{special_message: "This game is scheduled for %s".format(localTime)}];

      }else{

        var promise = new Promise(function(resolve, reject) {
         const url = NHL_BOXSCORE_URL.format(gameId)
         setTimeout(function(){Tp.Helpers.Http.get(url).then((response) => {
            const parsed = JSON.parse(response);
            var homePeriods = [];
            var awayPeriods = [];
            var homeLeader = "";
            var awayLeader = "";
            for (var i = 0; i < 4; i++){
              try {
                homePeriods.push(parsed['home']['scoring'][i]['points']);
                awayPeriods.push(parsed['away']['scoring'][i]['points']);
              }
              catch(error){
                homePeriods.push(0);
                awayPeriods.push(0);
              }
            }
            try {
              homeLeader = parsed['home']['leaders']['points'][0]['full_name'];
              awayLeader = parsed['away']['leaders']['points'][0]['full_name'];
            }
            catch(error){
              console.log(error)
            }

            let box_score = [{
              home_team: homeTeam,
              home_score: homeScore,
              home_period1: homePeriods[0],
              home_period2: homePeriods[1],
              home_period3: homePeriods[2],
              home_leading_scorer: homeLeader,
              away_team: awayTeam,
              away_score: awayScore,
              away_period1: awayPeriods[0],
              away_period2: awayPeriods[1],
              away_period3: awayPeriods[2],
              away_leading_scorer: awayLeader
            }]

            resolve(box_score);
        }); }, 1000);

      });
      return promise

      }
    });
  }

}
