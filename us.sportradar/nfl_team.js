"use strict";

const Tp = require('thingpedia');

const NFL_API_KEY = 'ru7baq9u5x3b4wh3q4g6p5qs';
const NFL_SCHEDULE_URL = 'http://api.sportradar.us/nfl/official/trial/v5/en/games/%d/reg/%d/schedule.json?api_key=' + NFL_API_KEY;
const NFL_BOXSCORE_URL = 'http://api.sportradar.us/nfl/official/trial/v5/en/games/%s/boxscore.json?api_key=' + NFL_API_KEY;

module.exports = class NFLSportRadarAPIDevice {

  constructor(platform) {

        //super(platform);
        this.platform = platform
        this.name = "Sport Radar NFL Channel";
        this.description = "The NFL Channel for Sport Radar";
        var seasonStart = new Date()

        seasonStart.setFullYear(2019);
        seasonStart.setMonth(8);
        seasonStart.setDate(5);

        this._seasonStart = seasonStart

  }

  get_week(){
    var today = new Date();
    var week = 0;
    while (this.compare_dates(today, this._seasonStart)){

      week+=1;
      today.setDate(today.getDate() - 7);

    }
    return week
  }

  compare_dates(date1, date2){
    if (date1.getFullYear() > date2.getFullYear()){
      return true
    }else if (date1.getFullYear() < date2.getFullYear()){
      return false
    }else if (date1.getMonth() > date2.getMonth()){
      return true
    }else if (date1.getMonth() < date2.getMonth()){
      return false
    }else if (date1.getDate() >= date1.getDate()){
      return true
    }else {
      return false
    }

  }

  _updateUrl() {

        const now = new Date;
        const week = this.get_week();
        // if (week == 0 || week > 16){
        //   throw new TypeError("The NFL regular season is over");
        // }

        this.url = NFL_SCHEDULE_URL.format(2018, 2);
        //console.log('url', this.url);
  }

  get_get_weekly_games(){

    this._updateUrl()
    return Tp.Helpers.Http.get(this.url).then((response) => {


        const parsed = JSON.parse(response);
        var game_statuses = [];

        const games = parsed['week']['games'];
        for (var i = 0; i < games.length; i++){
          let game_status = {

            home_team: games[i]['home']['alias'],
            home_score: games[i]['scoring']['home_points'],
            away_team: games[i]['away']['alias'],
            away_score: games[i]['scoring']['away_points'],
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
            console.error('Failed to process NBA game updates: ' + e.message);
            console.error(e.stack);
        });

  }

  get_get_team(team){

    this._updateUrl()
    return Tp.Helpers.Http.get(this.url).then((response) => {

        const parsed = JSON.parse(response);
        const games = parsed['week']['games'];
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
        const awayPoints = games[index]['scoring']['away_points'];
        const homePoints = games[index]['scoring']['home_points'];


        switch(gameStatus) {
        case 'nogame':
            var status_message = "%s has no game today".format(team_name);
            return [{
              result: status_message
            }]
        case 'scheduled':
            var status_message = "Next game is %s @ %s at %s".format(awayName, homeName, scheduledTime.toLocaleString(platform.locale, { timeZone: platform.timezone }));
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

        case 'flex-schedule':
            var status_message = "The game scheduled has not been finalized yet. For now, the next game is %s @ %s at %s".format(awayName, homeName, scheduledTime.toLocaleString(platform.locale, { timeZone: platform.timezone }));
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

        }

        return [];

    }).catch((e) => {
              console.error('Failed to process NBA game updates: ' + e.message);
              console.error(e.stack);
          });

  }

  get_get_boxscore(team){

    this._updateUrl();
    return Tp.Helpers.Http.get(this.url).then((response) => {

      const parsed = JSON.parse(response);
      const games = parsed['week']['games'];
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
      const homeScore = games[index]['scoring']['home_points'];
      const awayScore = games[index]['scoring']['away_points'];

      if (gameStatus === "nogame"){
         return [{special_message: "There is no %s game today. I can notify you when there is a game if you want?".format(teamName)}];
      }

      if (gameStatus === "scheduled"){

         const scheduledTime = games[index]['scheduled'];
         const localTime = scheduledTime.toLocaleString(platform.locale, { timeZone: platform.timezone })
         return [{special_message: "This game is scheduled for %s".format(localTime)}];

      }else{

        var promise = new Promise(function(resolve, reject) {
         const url = NFL_BOXSCORE_URL.format(gameId)
         setTimeout(function(){Tp.Helpers.Http.get(url).then((response) => {
            const parsed = JSON.parse(response);
            var homeQuarters = [];
            var awayQuarters = [];

            for (var i = 0; i < 4; i++){
              try {
                homeQuarters.push(parsed['scoring'][i]['home_points']);
                awayQuarters.push(parsed['scoring'][i]['away_points']);
              }
              catch(error){
                homeQuarters.push(0);
                awayQuarters.push(0);
              }
            }

            let box_score = [{
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
              away_quarter4: awayQuarters[3]
            }];

            resolve(box_score);
        }); }, 1000);

      });
      return promise

      }
    });
  }

}


// function get_get_boxscore(team){
//   return Tp.Helpers.Http.get(NBA_SCHEDULE_URL.format(2019, 4, 2)).then((response) => {
//     var parsed = JSON.parse(response);
//     const games = parsed['games'];
//     const team_name = team['team'];
//     var index = 0;
//     var gameStatus = "nogame"
//     var gameId = 0;
//
//
//     for (var i = 0; i < games.length; i++){
//       if (games[i]['home']['alias'] === team_name || games[i]['away']['alias'] === team_name){
//         index = i;
//         gameStatus = games[i]['status']
//         gameId = games[i]['id']
//       }
//     }
//     const home_team = games[index]['home']['alias'];
//     const away_team = games[index]['away']['alias'];
//
//
//
//     if (gameStatus === "inprogress" || gameStatus === "halftime"){
//          throw new TypeError("This is not an in progress game");
//     }else{
//       const sim_url = "http://api.sportradar.us/nba-sim3/games/1969289d-cbb0-490c-9987-add4058f5ea1/boxscore.json?api_key=uuha5uz669b2yrnwqccraywh"
//       var promise = new Promise(function(resolve, reject) {
//        setTimeout(function(){Tp.Helpers.Http.get(sim_url).then((response) => {
//           var parsed = JSON.parse(response);
//           var home_quarters = [];
//           var away_quarters = [];
//           var home_leader = "";
//           var away_leader = "";
//           for (var i = 0; i < 4; i++){
//             try {
//               home_quarters.push(parsed['home']['scoring'][i]['points']);
//               away_quarters.push(parsed['away']['scoring'][i]['points']);
//             }
//             catch(error){
//               home_quarters.push(0);
//               away_quarters.push(0);
//             }
//           }
//           try {
//             home_leader = parsed['home']['leaders']['points'][0]['full_name'];
//             away_leader = parsed['away']['leaders']['points'][0]['full_name'];
//           }
//           catch(error){
//             console.log(error)
//           }
//
//           let box_score = {
//             home_team: home_team,
//             home_quarter1: home_quarters[0],
//             home_quarter2: home_quarters[1],
//             home_quarter3: home_quarters[2],
//             home_quarter4: home_quarters[3],
//             home_leading_scorer: home_leader,
//             away_team: away_team,
//             away_quarter1: away_quarters[0],
//             away_quarter2: away_quarters[1],
//             away_quarter3: away_quarters[2],
//             away_quarter4: away_quarters[3],
//             away_leading_scorer: away_leader
//           }
//
//           resolve(box_score);
//       }); }, 1000);
//
//     });
//     return promise
//
//     }
//   });
// }
//
// get_get_boxscore({team: "GSW"}).then((response) => {
//   console.log(response)
// })
