"use strict";

String.prototype.format = function format() {
    return vprintf(this, arguments);
};

const Tp = require('thingpedia');

const MLB_API_KEY = 'xzzvcwgkt6q8c2agt8qrnqs3';
const MLB_SCHEDULE_URL = 'http://api.sportradar.us/mlb/trial/v6.5/en/games/%d/%d/%d/boxscore.json?api_key=' + MLB_API_KEY;
const MLB_BOXSCORE_URL = 'http://api.sportradar.us/mlb/trial/v6.5/en/games/%s/boxscore.json?api_key=' + MLB_API_KEY;

module.exports = class MLBSportRadarAPIDevice {


  constructor(platform) {

        this.platform = platform;
        this.name = "Sport Radar MLB Channel";
        this.description = "The MLB Channel for Sport Radar";

  }

  _updateUrl() {

        var now = new Date;
        this.url = MLB_SCHEDULE_URL.format(now.getFullYear(), now.getMonth() + 1, now.getDate() - 1);
        //console.log('url', this.url);
  }

  get_get_todays_games(){

    this._updateUrl();
    return Tp.Helpers.Http.get(this.url).then((response) => {

        const parsed = JSON.parse(response);
        var game_statuses = [];
        const games = parsed['league']['games'];

        for (var i = 0; i < games.length; i++){
          let game_status = {

            home_team: games[i]['game']['home']['abbr'],
            home_score: games[i]['game']['home']['runs'],
            away_team: games[i]['game']['away']['abbr'],
            away_score: games[i]['game']['away']['runs'],
            result: games[i]['game']['status']

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
            throw new TypeError("No MLB Games Today");
        });

  }

  get_get_team(team){

    this._updateUrl();
    return Tp.Helpers.Http.get(this.url).then((response) => {

        const parsed = JSON.parse(response);
        const games = parsed['league']['games'];
        var gameStatus;
        var index = 0;
        const platform = this.platform;
        const team_name = team['team'];

        for (var i = 0; i < games.length; i++){
          if (games[i]['game']['home']['abbr'] === team_name || games[i]['game']['away']['abbr'] === team_name){
            index = i;
            gameStatus = games[i]['game']['status'];
            if (gameStatus === "scheduled" || gameStatus === "inprogress"){
              break;
            }
          }
        }
        const scheduledTime = games[index]['game']['scheduled'];
        const awayName = games[index]['game']['away']['abbr'];
        const homeName = games[index]['game']['home']['abbr'];
        const awayPoints = games[index]['game']['away']['runs'];
        const homePoints = games[index]['game']['home']['runs'];

        switch(gameStatus) {

        case 'scheduled':
            var status_message = "Next game %s @ %s at %s".format(awayName, homeName, scheduledTime.toLocaleString(platform.locale, { timeZone: platform.timezone }));
            return [{
              result: status_message
                  }];
        case 'inprogress':
            var status_message = "Game update for %s @ %s: %d - %d".format(awayName, homeName, awayPoints, homePoints);
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
        case 'wdelay':
            var status_message = "The game has been delayed because of weather"
            return [{
              result: status_message
            }]
        case 'fdelay':
            var status_message = "The game has been delayed because of facility issues"
            return [{
              result: status_message
            }]
        case 'odelay':
            var status_message = "The game has been delayed"
            return [{
              result: status_message
            }]
        case 'canceled':
            var status_message = "The game has been canceled"
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

        case 'suspended':
            var status_message = "The game has been suspended"
            return [{
              result: status_message
            }]

        case 'maintenance':
            var status_message = "The game failed review and is being repaired"
            return [{
              result: status_message
            }]

        }

        return [];

    }).catch((e) => {
              return [{
                result: "There are no MLB games today"
              }]
          });

  }

  get_get_boxscore(team){

    this._updateUrl();
    return Tp.Helpers.Http.get(this.url).then((response) => {

        const parsed = JSON.parse(response);
        const games = parsed['league']['games'];
        const teamName = team['team'];
        var index = 0;
        var gameStatus = "nogame"
        var gameId;
        const platform = this.platform;

        for (var i = 0; i < games.length; i++){

          if (games[i]['game']['home']['abbr'] === teamName || games[i]['game']['away']['abbr'] === teamName){

            index = i;
            gameStatus = games[i]['game']['status'];
            gameId = games[i]['game']['id'];

          }

        }

        const homeTeam = games[index]['game']['home']['abbr']
        const awayTeam = games[index]['game']['away']['abbr']
        const homeScore = games[index]['game']['home']['runs']
        const awayScore = games[index]['game']['away']['runs']

        if (gameStatus === "nogame"){
           return [{status_message: "There is no %s game today. I can notify you when there is a game if you want?".format(teamName)}];
        }

        if (gameStatus === "scheduled"){

           const scheduledTime = games[index]['scheduled'];
           const localTime = scheduledTime.toLocaleString(platform.locale, { timeZone: platform.timezone })
           return [{status_message: "This game is scheduled for %s".format(localTime)}];

        }else{
           var promise = new Promise(function(resolve, reject) {


           setTimeout(function(){
             const url = MLB_BOXSCORE_URL.format(gameId)
             return Tp.Helpers.Http.get(url).then((response) => {

                const parsed = JSON.parse(response);
                var homeInnings = [];
                var awayInnings  = [];
                var homePitcher = "";
                var awayPitcher = "";

                for (var i = 0; i < 9; i++){
                  try {
                    homeInnings.push(parsed['game']['home']['scoring'][i]['runs']);
                    awayInnings.push(parsed['game']['away']['scoring'][i]['runs']);
                  }
                  catch(error){
                    homeInnings.push(0);
                    awayInnings.push(0);
                  }
                }
                try {
                  homePitcher = parsed['game']['home']['starting_pitcher']['preferred_name'] + " " + parsed['game']['home']['starting_pitcher']['last_name'];
                  awayPitcher = parsed['game']['away']['starting_pitcher']['preferred_name'] + " " + parsed['game']['away']['starting_pitcher']['last_name']
                }
                catch(error){
                  console.log(error)
                }

                let box_score = [{
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
                  away_starting_pitcher: awayPitcher
                }]

                resolve(box_score)

              });


           }, 1000);

         });
          return promise
        }
    });

  }

  parse_boxscore(game_id){



  }





}
