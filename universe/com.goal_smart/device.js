"use strict";

const Tp = require('thingpedia');

module.exports = class GoalDevice extends Tp.BaseDevice {
  constructor(engine, state) {
    super(engine, state);
    this.uniqueId = 'com.goal_smart';
    this.name = 'GoalSmart';
    this.description = 'Keep up with the latest in soccer';
  }

  // getting league standings, given league id
  get_standings({ league_id }) {
    return Tp.Helpers.Http.get('https://api-football-v1.p.rapidapi.com/v3/standings?season=2020&league=' + league_id, {
      extraHeaders: {
        'x-rapidapi-key': this.constructor.metadata.auth.api_key,
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
        useQueryString: true
      },
      accept: 'application/json'
    }).then((tempResponse) => {
      const a = JSON.parse(tempResponse);
      const b = a.response;
      return b.map((obj) => {
        const r = obj.rank;
        const n = obj.team.name;
        const f = obj.form;
        const p = obj.points;
        console.log(r + ". " + n + " | Form " + f + " | Points: " + p);
        return ({
          team: n,
          rank: r,
          form: f,
          points: p
        });
      });

    });
  }
  get_teamFixtures({ team_id }) {

    return Tp.Helpers.Http.get('https://api-football-v1.p.rapidapi.com/v3/fixtures?team='+ team_id + '&next=50', {
      extraHeaders: {
        'x-rapidapi-key': this.constructor.metadata.auth.api_key,
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
        useQueryString: true
      },
      accept: 'application/json'
    }).then((tempResponse) => {
      const a = JSON.parse(tempResponse);
      const b = a.response;
      return b.map((obj) => {
        const l = obj.league.name;
        const n1 = obj.teams.home.name;
        const n2 = obj.teams.away.name;
        const v = obj.fixture.venue.name;
        return [{
          league: l,
          team1: n1,
          team2: n2,
          venue: v
        }]

      })

    });

  }
};
