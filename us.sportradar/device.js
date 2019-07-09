// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//           2016 Riad S. Wahby <rsw@cs.stanford.edu> - extended with additional sports
//
// See LICENSE for details


function vprintf(str, args) {
    var i = 0;
    var usePos = false;
    return str.replace(/%(?:([1-9][0-9]*)\$)?([0-9]+)?(?:\.([0-9]+))?(.)/g, (str, posGroup, widthGroup, precisionGroup, genericGroup) => {
        if (precisionGroup && genericGroup !== 'f')
            throw new Error("Precision can only be specified for 'f'");

        var pos = parseInt(posGroup, 10) || 0;
        if (usePos === false && i === 0)
            usePos = pos > 0;
        if (usePos && pos === 0 || !usePos && pos > 0)
            throw new Error("Numbered and unnumbered conversion specifications cannot be mixed");

        var fillChar = (widthGroup && widthGroup[0] === '0') ? '0' : ' ';
        var width = parseInt(widthGroup, 10) || 0;

        function fillWidth(s, c, w) {
            var fill = '';
            for (var i = 0; i < w; i++)
                fill += c;
            return fill.substr(s.length) + s;
        }

        function getArg() {
            return usePos ? args[pos - 1] : args[i++];
        }

        var s = '';
        switch (genericGroup) {
        case '%':
            return '%';
        case 's':
            s = String(getArg());
            break;
        case 'd':
            var intV = parseInt(getArg());
            s = intV.toString();
            break;
        case 'x':
            s = parseInt(getArg()).toString(16);
            break;
        case 'f':
            if (precisionGroup === '' || precisionGroup === undefined)
                s = parseFloat(getArg()).toString();
            else
                s = parseFloat(getArg()).toFixed(parseInt(precisionGroup));
            break;
        default:
            throw new Error('Unsupported conversion character %' + genericGroup);
        }
        return fillWidth(s, fillChar, width);
    });
}

String.prototype.format = function format() {
    return vprintf(this, arguments);
};

const Tp = require('thingpedia');
const NbaTeam = require('./nba_team.js');
const MlbTeam = require('./mlb_team.js');
const NflTeam = require('./nfl_team.js');
const NhlTeam = require('./nhl_team.js');
const EUSoccerTeam = require('./soccer_eu_team.js');
const SportsNews = require('./sport_news.js');

soccer = new NhlTeam()
soccer.get_get_team({team:'sj'}).then((response) => {

  console.log(response)

});

module.exports = class SportsDevice extends Tp.BaseDevice {


    constructor(engine, state) {

        super(engine, state);

        this.nbaTeam = new NbaTeam(this.engine.platform);
        this.mlbTeam = new MlbTeam(this.engine.platform);
        this.nhlTeam = new NhlTeam(this.engine.platform);
        this.nflTeam = new NflTeam(this.engine.platform);
        this.euSoccerTeam = new EUSoccerTeam(this.engine.platform)
        this.sportsNews = new SportsNews();
        this.uniqueId = 'almond.sports';
        this.name = "Sports";
        this.description = "Universal Sports Skill which displays Sports scores, news, and stats. Supports NFL, NBA, European and USA Soccer, MLB, NCAAFB, and NCAAMBB.";
    }



    get_get_todays_games_nba(){

      return this.nbaTeam.get_get_todays_games();

    }

    get_get_todays_games_mlb(){

      return this.mlbTeam.get_get_todays_games();

    }

    get_get_todays_games_nhl(){

      return this.nhlTeam.get_get_todays_games();

    }

    get_get_weekly_games_nfl(){

      return this.nflTeam.get_get_weekly_games();

    }

    get_get_todays_games_eu_soccer(){

      return this.euSoccerTeam.get_get_todays_games();

    }

    get_get_team_nba(team){

      return this.nbaTeam.get_get_team(team);

    }

    get_get_team_mlb(team){

      return this.mlbTeam.get_get_team(team);

    }

    get_get_team_nhl(team){

      return this.nhlTeam.get_get_team(team);

    }

    get_get_team_nfl(team){

      return this.nflTeam.get_get_team(team);

    }

    get_get_team_eu_soccer(team){

      return this.euSoccerTeam.get_get_team(team);

    }

    get_get_boxscore_nba(team){

      return this.nbaTeam.get_get_boxscore(team);

    }

    get_get_boxscore_mlb(team){

      return this.mlbTeam.get_get_boxscore(team);

    }

    get_get_boxscore_nhl(team){

      return this.nhlTeam.get_get_boxscore(team);

    }

    get_get_boxscore_nfl(team){

      return this.nflTeam.get_get_boxscore(team);

    }

    get_get_boxscore_eu_soccer(team){

      return this.euSoccerTeam.get_get_boxscore(team);

    }

    get_get_sports_headlines(league){
      return this.sportsNews.get_get_sports_headlines(league);
    }


};
