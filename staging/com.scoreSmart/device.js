"use strict";

const Tp = require('thingpedia');
const unirest = require("unirest");

module.exports = class ScoreDevice extends Tp.BaseDevice {
  constructor(engine, state) {
    super(engine, state);
    this.uniqueId = 'com.scoreSmart';
    this.name = 'ScoreSmart';
    this.description = 'Keep up with the latest in soccer';
  }

  // getting league standings, given league id
  get_standings({ league_id }) {
    const request = require('request');

    const options = {
      method: 'GET',
      url: 'https://api-football-v1.p.rapidapi.com/v3/standings',
      qs: { season: '2020', league: league_id },
      headers: {
        'x-rapidapi-key': 'b9b9b1e851msh45c99175d8f8df8p103e18jsn903a05143134',
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
        useQueryString: true
      }
    };

    request(options, function (error, r, body) {
      if (error) throw new Error(error);
      const a = JSON.parse(body);
      const b = a.response[0].league.standings[0];
      return b.map((obj) => {
        const r = obj.rank;
        const n = obj.team.name;
        const f = obj.form;
        const p = obj.points;
        console.log(r + ". " + n + " | Form " + f + " | Points: " + p);
        return ({
          Team: n,
          Rank: r,
          Form: f,
          Points: p
        });
      });
    });
  }
  get_teamFixtures({ team_id }) {
    const request = require('request');

    const options = {
      method: 'GET',
      url: 'https://api-football-v1.p.rapidapi.com/v3/fixtures',
      qs: { team: team_id, next: '5' },
      headers: {
        'x-rapidapi-key': 'b9b9b1e851msh45c99175d8f8df8p103e18jsn903a05143134',
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
        useQueryString: true
      }
    };
    request(options, function (error, r, body) {
      if (error) throw new Error(error);
      const a = JSON.parse(body);
      const b = a.response;
      return b.map((obj) => {
        const l = obj.league.name;
        const n1 = obj.teams.home.name;
        const n2 = obj.teams.away.name;
        const v = obj.fixture.venue.name;
        return [{
          League: l,
          Team1: n1,
          Team2: n2,
          Venue: v
        }]

      })

    });

  }
};
