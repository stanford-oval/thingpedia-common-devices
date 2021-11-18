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

    get_teamCoach({ team_id }) {

        return Tp.Helpers.Http.get('https://api-football-v1.p.rapidapi.com/v3/coachs?team=' + team_id, {
      extraHeaders: {
        'x-rapidapi-key': this.constructor.metadata.auth.api_key,
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
      },
      accept: 'application/json'
        }).then((tempResponse) => {
            const a = JSON.parse(tempResponse);
            const rv = a.response[0].name;
            const rv_id = a.response[0].id;
            const rvF = [{
        coach: new Tp.Value.Entity(String(rv_id), String(rv))
            }];
            return rvF;
        });
    }

    get_fixtures({ team_id }) {
        let today = new Date();
        let priorDate = new Date(new Date().setDate(today.getDate() - 30));
        let pD = priorDate.toISOString().slice(0, 10);
        let futureDate = new Date(new Date().setDate(today.getDate() + 30));
        let fD = futureDate.toISOString().slice(0, 10);
        return Tp.Helpers.Http.get('https://api-football-v1.p.rapidapi.com/v3/fixtures?season=2020&team=' + team_id + '&from=' + pD + '&to=' + fD, {
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
                let v = obj.fixture.venue.name;
                let id1 = obj.teams.home.id;
                let id2 = obj.teams.away.id;
                let ourName = obj.teams.home.name;
                let theirName = obj.teams.away.name;
                let ourScore = obj.goals.home;
                let theirScore = obj.goals.away;
                const fd1 = obj.fixture.date;
                const fixtureDate = new Date(fd1);
                let gameScore = "has not been recorded";
                if (team_id !== id1) {
                    id1 = obj.teams.away.id;
                    id2 = obj.teams.home.id;
                    ourName = obj.teams.away.name;
                    theirName = obj.teams.home.name;
                    ourScore = obj.goals.away;
                    theirScore = obj.goals.home;
                }
                if (ourScore !== null)
                    gameScore = " was " + ourScore + " - " + theirScore;
                let r = "tied";
                if (ourScore > theirScore)
                    r = "won";
                if (theirScore > ourScore)
                    r = "lost";
                if (obj.goals.away === null)
                    r = "play";
                return ({
          league: new Tp.Value.Entity(String(l_id), String(l)),
          our_team: new Tp.Value.Entity(String(id1), String(ourName)),
          opposition_team: new Tp.Value.Entity(String(id2), String(theirName)),
          score: gameScore,
          venue: v,
          date: fixtureDate,
          result: r
                });
            });
        });
    }
  
    async *get_player({ league_id }) {
        let i = 0;
        while (i < 38) {
            i += 1;
            const tempResponse = await Tp.Helpers.Http.get('https://api-football-v1.p.rapidapi.com/v3/players?league=' + league_id + '&season=2020&page=' + JSON.stringify(i), {
        extraHeaders: {
          'x-rapidapi-key': this.constructor.metadata.auth.api_key,
          'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
        },
        accept: 'application/json'
            });
            const a = JSON.parse(tempResponse);
            const b = a.response;
            for (const obj of b) {
                const n = obj.player.name;
                const n_id = obj.player.id;
                let g = obj.statistics[0].goals.total;
                if (g === null)
                    g = 0;
                let a = obj.statistics[0].goals.assists;
                if (a === null)
                    a = 0;
                let rc = obj.statistics[0].cards.red;
                if (rc === null)
                    rc = 0;
                let yc = obj.statistics[0].cards.yellow;
                if (yc === null)
                    yc = 0;
                let gms = obj.statistics[0].games.appearences;
                if (gms === null)
                    gms = 0;
                let mns = obj.statistics[0].games.minutes;
                if (mns === null)
                    mns = 0;
                let shts = obj.statistics[0].shots.total;
                if (shts === null)
                    shts = 0;
                let shtsON = obj.statistics[0].shots.on;
                if (shtsON === null)
                    shtsON = 0;
                let pss = obj.statistics[0].passes.total;
                if (pss === null)
                    pss = 0;
                let pssAcc = obj.statistics[0].passes.accuracy;
                if (pssAcc === null)
                    pssAcc = 0;
                let kPss = obj.statistics[0].passes.key;
                if (kPss === null)
                    kPss = 0;
                let drib = obj.statistics[0].dribbles.attempts;
                if (drib === null)
                    drib = 0;
                let succDrib = obj.statistics[0].dribbles.success;
                if (succDrib === null)
                    succDrib = 0;
                let tckles = obj.statistics[0].tackles.total;
                if (tckles === null)
                    tckles = 0;
                let blcks = obj.statistics[0].tackles.blocks;
                if (blcks === null)
                    blcks = 0;
                let incpts = obj.statistics[0].tackles.interceptions;
                if (incpts === null)
                    incpts = 0;
                const rv = ({
          id: new Tp.Value.Entity(String(n_id), String(n)),
          goals: g,
          assists: a,
          red_cards: rc,
          yellow_cards: yc,
          appearances: gms,
          minutes: mns,
          shots: shts,
          shots_on_target: shtsON,
          passes: pss,
          key_passes: kPss,
          pass_accuracy: pssAcc,
          dribble_attempts: drib,
          successful_dribbles: succDrib,
          tackles: tckles,
          blocks: blcks,
          interceptions: incpts
                });
                yield rv;
            }
        }
    }
    async *get_lineup({ team_id }) {
        const tempResponse = await Tp.Helpers.Http.get('https://api-football-v1.p.rapidapi.com/v3/fixtures?team=' + team_id + '&last=1', {
      extraHeaders: {
        'x-rapidapi-key': this.constructor.metadata.auth.api_key,
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
      },
      accept: 'application/json'
        });
        const a = JSON.parse(tempResponse);
        const b = a.response;
        const fixture_id = JSON.stringify(b[0].fixture.id);
        const tempResponse1 = await Tp.Helpers.Http.get('https://api-football-v1.p.rapidapi.com/v3/fixtures/lineups?fixture=' + fixture_id + '&team=' + team_id, {
      extraHeaders: {
        'x-rapidapi-key': this.constructor.metadata.auth.api_key,
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
      },
      accept: 'application/json'
        });
        const a1 = JSON.parse(tempResponse1);
        const b1 = a1.response[0].startXI;
        for (const obj of b1) {
            const player_name = obj.player.name;
            const player_id = obj.player.id;
            let player_pos = obj.player.pos;
            const player_num = obj.player.number;
            if (player_pos === "G")
                player_pos = "goalkeeper";

            if (player_pos === "D")
                player_pos = "defender";

            if (player_pos === "M")
                player_pos = "midfielder";

            if (player_pos === "F")
                player_pos = "forward";

            const rv = ({
        player: new Tp.Value.Entity(String(player_id), String(player_name)),
        jersey_number: player_num,
        position: player_pos
            });
            yield rv;
        }
    }

    async *get_trophies({ player_id }) {

        const tempResponse = await Tp.Helpers.Http.get('https://api-football-v1.p.rapidapi.com/v3/trophies?player=' + player_id, {
      extraHeaders: {
        'x-rapidapi-key': this.constructor.metadata.auth.api_key,
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
      },
      accept: 'application/json'
        });
        const a = JSON.parse(tempResponse);
        const b = a.response;
        for (const obj of b) {
            let league = obj.league;
            let ranking = obj.place;
            let szn = obj.season;
            const rv = ({
        trophy: league,
        rank: ranking,
        season: szn
            });
            yield rv;
        }
    }

    async *get_teamPredictions({ team_id }) {

        const tempResponse = await Tp.Helpers.Http.get('https://api-football-v1.p.rapidapi.com/v3/fixtures?team=' + team_id + '&next=3', {
      extraHeaders: {
        'x-rapidapi-key': this.constructor.metadata.auth.api_key,
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
      },
      accept: 'application/json'
        });
        const a = JSON.parse(tempResponse);
        const b = a.response;
        for (const obj of b) {
            const fixture_id = JSON.stringify(obj.fixture.id);
            const tempResponse1 = await Tp.Helpers.Http.get('https://api-football-v1.p.rapidapi.com/v3/predictions?fixture=' + fixture_id, {
        extraHeaders: {
          'x-rapidapi-key': this.constructor.metadata.auth.api_key,
          'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
        },
        accept: 'application/json'
            });
            const a1 = JSON.parse(tempResponse1);
            const b1 = a1.response[0];
            let t1 = b1.teams.home.name;
            let t1_id = b1.teams.home.id;
            let t2 = b1.teams.away.name;
            let t2_id = b1.teams.away.id;
            let l = b1.league.name;
            let l_id = b1.league.id;
            let win_percentage = b1.predictions.percent.home;
            let historic_win_percentage = b1.comparison.h2h.home;
            let previous_meeting = b1.h2h[0].goals.home + " - " + b1.h2h[0].goals.away;
            let score_prediction = Math.abs(b1.predictions.goals.home) + " - " + Math.abs(b1.predictions.goals.away);
            if (t1_id !== team_id) {
                t1 = b1.teams.away.name;
                t1_id = b1.teams.away.id;
                t2 = b1.teams.home.name;
                t2_id = b1.teams.home.id;
                win_percentage = b1.predictions.percent.away;
                historic_win_percentage = b1.comparison.h2h.away;
                previous_meeting = b1.h2h[0].goals.away + " - " + b1.h2h[0].goals.home;
                score_prediction = Math.abs(b1.predictions.goals.away) + " - " + Math.abs(b1.predictions.goals.home);
            }
            const rv = ({
        our_team: new Tp.Value.Entity(String(t1_id), String(t1)),
        opposition_team: new Tp.Value.Entity(String(t2_id), String(t2)),
        league: new Tp.Value.Entity(String(l_id), String(l)),
        chance_of_winning: win_percentage,
        history_head_to_head: historic_win_percentage,
        previous_meeting_score: previous_meeting,
        prediction_score: score_prediction
            });
            yield rv;
        }

    }
};



