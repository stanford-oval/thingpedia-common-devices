"use strict";

const Tp = require('thingpedia');

module.exports = class GoalDevice extends Tp.BaseDevice {
  constructor(engine, state) {
    super(engine, state);
    this.uniqueId = 'com.goal_smart'; //
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
      const b = a.response[0].league.standings[0];
      return b.map((obj) => {
        const r = obj.rank;
        const n = obj.team.name;
        const f = obj.form;
        const p = obj.points;
        return ({
          team: n,
          rank: r,
          form: f,
          points: p
        });
      });

    });
  }
  // getting the upcoming fixtures of a team, given team id
  get_teamFixtures({ team_id }) {
    return Tp.Helpers.Http.get('https://api-football-v1.p.rapidapi.com/v3/fixtures?team=' + team_id + '&next=5', {
      extraHeaders: {
        'x-rapidapi-key': this.constructor.metadata.auth.api_key,
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
        useQueryString: true
      },
      accept: 'application/json'
    }).then((tempResponse) => {
      const a = JSON.parse(tempResponse);
      const b = a.response;
      if (b==null) {
        print ("Helloooooooo");
        print ("Helloooooooo");
        print ("Helloooooooo");
        print ("Helloooooooo");
        print ("Helloooooooo");
      }
      return b.map((obj) => {
        const l = obj.league.name;
        const n1 = obj.teams.home.name;
        const n2 = obj.teams.away.name;
        const v = obj.fixture.venue.name;
        return ({
          league: l,
          team1: n1,
          team2: n2,
          venue: v
        });

      });

    });

  }
  // getting the upcoming fixtures of a team, given team id
  get_previousFixtures({ team_id }) {
    return Tp.Helpers.Http.get('https://api-football-v1.p.rapidapi.com/v3/fixtures?team=' + team_id + '&last=5', {
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
        const g1 = obj.goals.home;
        const g2 = obj.goals.away;
        const v = obj.fixture.venue.name;
        return ({
          league: l,
          team1: n1,
          team2: n2,
          score1: g1,
          score2: g2,
          venue: v
        });

      });

    });


  }

  // getting league top scorers, given league id
  get_topscorers({ league_id }) {
    return Tp.Helpers.Http.get('https://api-football-v1.p.rapidapi.com/v3/players/topscorers?league=' + league_id + '&season=2020', {
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
        const n = obj.player.name;
        const g = obj.statistics[0].goals.total;
        return ({
          player: n,
          goals: g
        });
      });

    });
  }



  get_teamUpdate({ team_id }) {
    return Tp.Helpers.Http.get('https://api-football-v1.p.rapidapi.com/v3/teams?search=' + team_id, {
      extraHeaders: {
        'x-rapidapi-key': this.constructor.metadata.auth.api_key,
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
        useQueryString: true
      },
      accept: 'application/json'
    }).then((tempResponse) => {
      const a = JSON.parse(tempResponse);
      const b = a.response;
      const teamName = b[0].team.name;
      const teamID = b[0].team.id;
      return Tp.Helpers.Http.get('https://api-football-v1.p.rapidapi.com/v3/standings?season=2020&team=' + teamID, {
        extraHeaders: {
          'x-rapidapi-key': this.constructor.metadata.auth.api_key,
          'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
          useQueryString: true
        },
        accept: 'application/json'
      }).then((tempResponse1) => {
        const a1 = JSON.parse(tempResponse1);
        const b1 = a1.response;
        const leagueName = b1[1].league.name;
        const ranking = b1[1].league.standings[0][0].rank;
        return Tp.Helpers.Http.get('https://api-football-v1.p.rapidapi.com/v3/fixtures?team=' + teamID + '&last=1', {
          extraHeaders: {
            'x-rapidapi-key': this.constructor.metadata.auth.api_key,
            'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
            useQueryString: true
          },
          accept: 'application/json'
        }).then((tempResponse2) => {
          const a2 = JSON.parse(tempResponse2);
          const b2 = a2.response;
          var n1 = b2[0].teams.home.name;
          var g1 = b2[0].goals.home;
          var g2 = b2[0].goals.away;
          if (n1 == teamName) {
            n1 = b2[0].teams.home.away;
          } else {
            var g1 = b2[0].goals.away;
            var g2 = b2[0].goals.home;
          }
          const oppTeam = n1;
          const ourScore = g1;
          const theirScore = g2;

          const updateFinal = teamName + " is currently numer " + ranking + " in the " + leagueName + ". Their last match was against " + oppTeam + " and the score was " + ourScore + " to " + theirScore + ".";

          return [{
            update: updateFinal
          }];
        });
      });
    });


  }

};
