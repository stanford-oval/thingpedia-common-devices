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
        this.euSoccerTeam = new EUSoccerTeam(this.engine.platform, this.keys
            .eusoccer_api_key);
        this.amSoccerTeam = new AMSoccerTeam(this.engine.platform, this.keys
            .amsoccer_api_key);
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

    get_nhl_games({ date }) {
        return this.nhlTeam.get_games(date);
    }
    get_nhl_team_ranking({ team, year }) {
        return this.nhlTeam.get_team_ranking(team, year);
    }
    get_nhl_boxscore({ date }) {
        return this.nhlTeam.get_boxscore(date);
    }
    get_nhl_roster({ team }) {
        return this.nhlTeam.get_roster(team);
    }

    get_nfl_games({ week, year }) {
        return this.nflTeam.get_games(week, year);
    }
    get_nfl_team_ranking({ team, year }) {
        return this.nflTeam.get_team_ranking(team, year);
    }
    get_nfl_boxscore({ week, year }) {
        return this.nflTeam.get_boxscore(week, year);
    }
    get_nfl_roster({ team }) {
        return this.nflTeam.get_roster(team);
    }

    get_ncaamb_games({ date }) {
        return this.ncaaMbTeam.get_games(date);
    }
    get_ncaamb_team_ranking({ team, year }) {
        return this.ncaaMbTeam.get_team_ranking(team, year);
    }
    get_ncaamb_boxscore({ date }) {
        return this.ncaaMbTeam.get_boxscore(date);
    }
    get_ncaamb_roster({ team }) {
        return this.ncaaMbTeam.get_roster(team);
    }

    get_ncaafb_games({ week, year }) {
        return this.ncaaFbTeam.get_games(week, year);
    }
    get_ncaafb_team_ranking({ team, year }) {
        return this.ncaaFbTeam.get_team_ranking(team, year);
    }
    get_ncaafb_boxscore({ week, year }) {
        return this.ncaaFbTeam.get_boxscore(week, year);
    }
    get_ncaafb_roster({ team }) {
        return this.ncaaFbTeam.get_roster(team);
    }

    get_eu_soccer_games({ league, date }) {
        return this.euSoccerTeam.get_games(league, date);
    }
    get_eu_soccer_boxscore({ league, date }) {
        return this.euSoccerTeam.get_boxscore(league, date);
    }
    get_eu_soccer_league_rankings({ league }) {
        return this.euSoccerTeam.get_league_rankings(league);
    }

    get_am_soccer_games({ league, date }) {
        return this.amSoccerTeam.get_games(league, date);
    }
    get_am_soccer_boxscore({ league, date }) {
        return this.amSoccerTeam.get_boxscore(league, date);
    }
    get_am_soccer_league_rankings({ league }) {
        return this.amSoccerTeam.get_league_rankings(league);
    }
};