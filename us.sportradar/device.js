"use strict";

const Tp = require("thingpedia");
const NbaTeam = require("./nba_team.js");
const MlbTeam = require("./mlb_team.js");
const NflTeam = require("./nfl_team.js");
const NhlTeam = require("./nhl_team.js");
const EUSoccerTeam = require("./soccer_eu_team.js");
const AMSoccerTeam = require("./soccer_am_team.js");
const SportsNews = require("./sport_news.js");

module.exports = class SportsDevice extends Tp.BaseDevice {
  constructor(engine, state) {
    super(engine, state);

    this.nbaTeam = new NbaTeam(this.engine.platform);
    this.mlbTeam = new MlbTeam(this.engine.platform);
    this.nhlTeam = new NhlTeam(this.engine.platform);
    this.nflTeam = new NflTeam(this.engine.platform);
    this.euSoccerTeam = new EUSoccerTeam(this.engine.platform);
    this.amSoccerTeam = new AMSoccerTeam();
    this.sportsNews = new SportsNews();
    this.uniqueId = "almond.sports";
    this.name = "Sports";
    this.description =
      "Universal Sports Skill which displays Sports scores, news, and stats. Supports NFL, NBA, European and USA Soccer, MLB, NCAAFB, and NCAAMBB.";
  }

  get_get_todays_games_nba() {
    return this.nbaTeam.get_get_todays_games();
  }

  get_get_todays_games_mlb() {
    return this.mlbTeam.get_get_todays_games();
  }

  get_get_todays_games_nhl() {
    return this.nhlTeam.get_get_todays_games();
  }

  get_get_weekly_games_nfl() {
    return this.nflTeam.get_get_weekly_games();
  }

  get_get_todays_games_eu_soccer() {
    return this.euSoccerTeam.get_get_todays_games();
  }

  get_get_todays_games_am_soccer() {
    return this.amSoccerTeam.get_get_todays_games();
  }

  get_get_team_nba(team) {
    return this.nbaTeam.get_get_team(team);
  }

  get_get_team_mlb(team) {
    return this.mlbTeam.get_get_team(team);
  }

  get_get_team_nhl(team) {
    return this.nhlTeam.get_get_team(team);
  }

  get_get_team_nfl(team) {
    return this.nflTeam.get_get_team(team);
  }

  get_get_team_eu_soccer(team) {
    return this.euSoccerTeam.get_get_team(team);
  }

  get_get_team_am_soccer(team) {
    return this.amSoccerTeam.get_get_team(team);
  }

  get_get_boxscore_nba(team) {
    return this.nbaTeam.get_get_boxscore(team);
  }

  get_get_boxscore_mlb(team) {
    return this.mlbTeam.get_get_boxscore(team);
  }

  get_get_boxscore_nhl(team) {
    return this.nhlTeam.get_get_boxscore(team);
  }

  get_get_boxscore_nfl(team) {
    return this.nflTeam.get_get_boxscore(team);
  }

  get_get_rankings_eu_soccer(team) {
    return this.euSoccerTeam.get_get_rankings(team);
  }

  get_get_rankings_am_soccer(team) {
    return this.amSoccerTeam.get_get_rankings(team);
  }

  get_get_sports_headlines(league) {
    return this.sportsNews.get_get_sports_headlines(league);
  }
};
