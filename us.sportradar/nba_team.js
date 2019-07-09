"use strict";

const Tp = require('thingpedia');

const NBA_API_KEY = 'uuha5uz669b2yrnwqccraywh';
const NBA_SCHEDULE_URL = 'http://api.sportradar.us/nba/trial/v5/en/games/%d/%d/%d/schedule.json?api_key=' + NBA_API_KEY;
const NBA_BOXSCORE_URL = 'http://api.sportradar.us/nba/trial/v5/en/games/%s/boxscore.json?api_key=' + NBA_API_KEY;

module.exports = class NBASportRadarAPIDevice {

  constructor(platform) {

        //super(platform);
        this.platform = platform
        this.name = "Sport Radar NBA Channel";
        this.description = "The NBA Channel for Sport Radar";

  }

  _updateUrl() {

        var now = new Date;
        this.url = NBA_SCHEDULE_URL.format(now.getFullYear(), now.getMonth() + 1, now.getDate());
        //console.log('url', this.url);
  }

  get_get_todays_games(){

    return Tp.Helpers.Http.get(NBA_SCHEDULE_URL.format(2019, 4, 2)).then((response) => {


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
            throw new TypeError("No NBA Games Today");
        });

  }

  get_get_team(team){

    return Tp.Helpers.Http.get(NBA_SCHEDULE_URL.format(2019, 4, 2)).then((response) => {

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

    return Tp.Helpers.Http.get(NBA_SCHEDULE_URL.format(2019, 4, 2)).then((response) => {

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
         return [{status_message: "There is no %s game today. I can notify you when there is a game if you want?".format(teamName)}];
      }

      if (gameStatus === "scheduled"){

         const scheduledTime = games[index]['scheduled'];
         const localTime = scheduledTime.toLocaleString(platform.locale, { timeZone: platform.timezone })
         return [{status_message: "This game is scheduled for %s".format(localTime)}];

      }else{

        var promise = new Promise(function(resolve, reject) {
         const url = NBA_BOXSCORE_URL.format(gameId)
         setTimeout(function(){Tp.Helpers.Http.get(url).then((response) => {
            const parsed = JSON.parse(response);
            var homeQuarters = [];
            var awayQuarters = [];
            var homeLeader = "";
            var awayLeader = "";
            for (var i = 0; i < 4; i++){
              try {
                homeQuarters.push(parsed['home']['scoring'][i]['points']);
                awayQuarters.push(parsed['away']['scoring'][i]['points']);
              }
              catch(error){
                homeQuarters.push(0);
                awayQuarters.push(0);
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
              home_quarter1: homeQuarters[0],
              home_quarter2: homeQuarters[1],
              home_quarter3: homeQuarters[2],
              home_quarter4: homeQuarters[3],
              home_leading_scorer: homeLeader,
              away_team: awayTeam,
              away_score: awayScore,
              away_quarter1: awayQuarters[0],
              away_quarter2: awayQuarters[1],
              away_quarter3: awayQuarters[2],
              away_quarter4: awayQuarters[3],
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
