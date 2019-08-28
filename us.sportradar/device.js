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
const NbaTeam = require("./nba_team.js");
const MlbTeam = require("./mlb_team.js");
const NflTeam = require("./nfl_team.js");
const NhlTeam = require("./nhl_team.js");
const EUSoccerTeam = require("./soccer_eu_team.js");
const AMSoccerTeam = require("./soccer_am_team.js");
const NCAAMbTeam = require("./ncaa_mb_team.js");
const NCAAFbTeam = require("./ncaa_fb_team.js");

module.exports = class SportsDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);
        this.keys = JSON.parse(this.constructor.metadata.auth.api_key);

        this.nbaTeam = new NbaTeam(this.engine.platformj, this.keys.nba_api_key);
        this.mlbTeam = new MlbTeam(this.engine.platform, this.keys.mlb_api_key);
        this.nhlTeam = new NhlTeam(this.engine.platform, this.keys.nhl_api_key);
        this.nflTeam = new NflTeam(this.engine.platform, this.keys.nfl_api_key);
        this.ncaaMbTeam = new NCAAMbTeam(this.engine.platform, this.keys.ncaamb_api_key);
        this.ncaaFbTeam = new NCAAFbTeam(this.engine.platform, this.keys.ncaafb_api_key);
        this.euSoccerTeam = new EUSoccerTeam(this.engine.platform, this.keys.eusoccer_api_key);
        this.amSoccerTeam = new AMSoccerTeam(this.engine.platform, this.keys.amsoccer_api_key);
        this.uniqueId = "almond.sports";
        this.name = "Sportradar and NewsApi Sports Skill";
        this.description =
            "Sports Skill which displays Sports scores, news, and stats. Supports NFL, NBA, European and American Soccer, MLB, NCAAFB, and NCAAMBB.";
    }

    get_nba_games({ date }) {
        return this.nbaTeam.get_games(date);
    }
    get_nba_team_ranking({ team, year }) {
        return this.nbaTeam.get_team_ranking(team, year);
    }
    get_nba_boxscore({ date }) {
        return this.nbaTeam.get_boxscore(date);
    }
    get_nba_roster({ team }) {
        return this.nbaTeam.get_roster(team);
    }

    get_mlb_games({ date }) {
        return this.mlbTeam.get_games(date);
    }
    get_mlb_team_ranking({ team, year }) {
        return this.mlbTeam.get_team_ranking(team, year);
    }
    get_mlb_boxscore({ date }) {
        return this.mlbTeam.get_boxscore(date);
    }
    get_mlb_roster({ team }) {
        return this.mlbTeam.get_roster(team);
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

    get_get_todays_games_ncaa_mb() {
        return this.ncaaMbTeam.get_get_todays_games();
    }

    get_get_weekly_games_ncaa_fb() {
        return this.ncaaFbTeam.get_get_weekly_games();
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

    get_get_team_ncaa_mb(team) {
        return this.ncaaMbTeam.get_get_team(team);
    }

    get_get_team_ncaa_fb(team) {
        return this.ncaaFbTeam.get_get_team(team);
    }

    get_get_boxscore_nhl(team) {
        return this.nhlTeam.get_get_boxscore(team);
    }

    get_get_boxscore_nfl(team) {
        return this.nflTeam.get_get_boxscore(team);
    }

    get_get_boxscore_ncaa_mb(team) {
        return this.ncaaMbTeam.get_get_boxscore(team);
    }

    get_get_boxscore_ncaa_fb(team) {
        return this.ncaaFbTeam.get_get_boxscore(team);
    }

    get_get_roster_nfl(team) {
        return this.nflTeam.get_get_roster(team);
    }

    get_get_roster_nhl(team) {
        return this.nhlTeam.get_get_roster(team);
    }

    get_get_roster_ncaa_mb(team) {
        return this.ncaaMbTeam.get_get_roster(team);
    }

    get_get_roster_ncaa_fb(team) {
        return this.ncaaFbTeam.get_get_roster(team);
    }

    get_get_rankings_eu_soccer(soccer_league) {
        return this.euSoccerTeam.get_get_rankings(soccer_league);
    }

    get_get_rankings_am_soccer(soccer_league) {
        return this.amSoccerTeam.get_get_rankings(soccer_league);
    }
};