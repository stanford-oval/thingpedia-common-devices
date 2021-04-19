// Copyright 2021 Arth Bohra <arthbohra@gmail.com>
//           2018-2021 Dougherty Valley High School
//
// Redistribution and use in source and binary forms, with or
// without modification, are permitted provided that the following
// conditions are met:
//
// 1. Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above
//    copyright notice, this list of conditions and the following
//    disclaimer in the documentation and/or other materials
//    provided with the distribution.
// 3. Neither the name of the copyright holder nor the names of its
//    contributors may be used to endorse or promote products derived
//    from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
// INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
// SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
// HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
// STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED
// OF THE POSSIBILITY OF SUCH DAMAGE.



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
    let month = new Date().getMonth();
    let date = new Date().getFullYear() - 1;
    if (month > 7)
      date = new Date().getFullYear();

    return Tp.Helpers.Http.get('https://api-football-v1.p.rapidapi.com/v3/standings?season=' + date + '&league=' + league_id, {
      extraHeaders: {
        'x-rapidapi-key': this.constructor.metadata.auth.api_key,
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
      },
      accept: 'application/json'
    }).then((tempResponse) => {
      const a = JSON.parse(tempResponse);
      const b = a.response[0].league.standings[0];
      return b.map((obj) => {
        const r = obj.rank;
        const n = obj.team.name;
        const t_id = obj.team.id;
        const f = obj.form;
        let fArray = [];
        let length = f.length;
        for (let i = 0; i < length; i++)
          fArray.push(f[i]);

        const p = obj.points;
        return ({
          team: new Tp.Value.Entity(String(t_id), String(n)),
          rank: r,
          form: fArray,
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
      return b.map((obj) => {
        const l = obj.league.name;
        const l_id = obj.league.id;
        const n1 = obj.teams.home.name;
        const t1_id = obj.teams.home.id;
        const n2 = obj.teams.away.name;
        const t2_id = obj.teams.home.id;
        const v = obj.fixture.venue.name;
        return ({
          team: new Tp.Value.Entity(String(l_id), String(l)),
          team1: new Tp.Value.Entity(String(t1_id), String(n1)),
          team2: new Tp.Value.Entity(String(t2_id), String(n2)),
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
      },
      accept: 'application/json'
    }).then((tempResponse) => {
      const a = JSON.parse(tempResponse);
      const b = a.response;

      return b.map((obj) => {

        const l = obj.league.name;
        const l_id = obj.league.id;
        let v = obj.fixture.venue.name;
        let id1 = obj.teams.home.id;
        let id2 = obj.teams.away.id;
        let ourName = obj.teams.home.name;
        let theirName = obj.teams.away.name;
        let ourScore = obj.goals.home;
        let theirScore = obj.goals.away;

        if (team_id !== id1) {
          id1 = obj.teams.away.id;
          id2 = obj.teams.home.id;
          ourName = obj.teams.away.name;
          theirName = obj.teams.home.name;
          ourScore = obj.goals.away;
          theirScore = obj.goals.home;

        }
        let r = "tied";
        if (ourScore > theirScore)
          r = "won";

        if (theirScore > ourScore)
          r = "lost";

        return ({
          league: new Tp.Value.Entity(String(l_id), String(l)),
          our_team: new Tp.Value.Entity(String(id1), String(ourName)),
          opposition_team: new Tp.Value.Entity(String(id2), String(theirName)),
          our_score: ourScore,
          opposition_score: theirScore,
          venue: v,
          result: r
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

    return Tp.Helpers.Http.get('https://api-football-v1.p.rapidapi.com/v3/teams?id=' + team_id, {
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
      let t1_id = b[0].team.id;
      return Tp.Helpers.Http.get('https://api-football-v1.p.rapidapi.com/v3/standings?season=2020&team=' + team_id, {
        extraHeaders: {
          'x-rapidapi-key': this.constructor.metadata.auth.api_key,
          'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
        },
        accept: 'application/json'
      }).then((tempResponse1) => {
        const a1 = JSON.parse(tempResponse1);
        const b1 = a1.response;
        const leagueName = b1[1].league.name;
        const l_id = b1[1].league.id;
        const ranking = b1[1].league.standings[0][0].rank;
        return Tp.Helpers.Http.get('https://api-football-v1.p.rapidapi.com/v3/fixtures?team=' + team_id + '&last=1', {
          extraHeaders: {
            'x-rapidapi-key': this.constructor.metadata.auth.api_key,
            'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
          },
          accept: 'application/json'
        }).then((tempResponse2) => {
          const a2 = JSON.parse(tempResponse2);
          const b2 = a2.response;
          let n1 = b2[0].teams.home.name;
          let t2_id = b2[0].teams.home.id;

          let g1 = b2[0].goals.home;
          let g2 = b2[0].goals.away;
          if (n1 === teamName) {
            n1 = b2[0].teams.home.away;
            t2_id = b2[0].teams.away.id;
          } else {
            g1 = b2[0].goals.away;
            g2 = b2[0].goals.home;
          }
          return [{
            team: new Tp.Value.Entity(String(t1_id), String(teamName)),
            last_opponent: new Tp.Value.Entity(String(t2_id), String(n1)),
            score_of_last_match: (g1 + " - " + g2),
            league: new Tp.Value.Entity(String(l_id), String(leagueName)),
            league_ranking: ranking
          }];
        });
      });


    });






  }

};
