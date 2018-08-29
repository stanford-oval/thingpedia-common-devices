// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2018 Google LLC
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');
const assert = require('assert');

function assertNonEmptyString(what) {
    assert(typeof what === 'string' && what, 'Expected a non-empty string, got ' + what);
}
function assertEnum(what, choices) {
    assert(choices.indexOf(what) >= 0, `Expected one of ${choices.join(',  ')}, got ${what}`);
}

module.exports = [
    ['query', 'mlb', { team: new Tp.Value.Entity('sf', 'San Francisco Giants') }, (results) => {
        assert(results.length === 0 || results.length === 1, 'Expected 0 or 1 results');
        if (results.length === 0)
            return;
        const game = results[0];
        assert(game.opponent instanceof Tp.Value.Entity);
        assert.strictEqual(typeof game.is_home, 'boolean');
        assertEnum(game.game_status, ['scheduled','inprogress','halftime','closed']);
        assert(game.scheduled_time instanceof Date);
        assertNonEmptyString(game.game_inning);
        assert.strictEqual(typeof game.opponent_runs, 'number');
        assert.strictEqual(typeof game.team_runs, 'number');
        assert(game.opponent_runs >= 0);
        assert(game.team_runs >= 0);
    }],

    ['query', 'nba', { team: new Tp.Value.Entity('gsw', 'Golden State Warriors') }, (results) => {
        assert(results.length === 0 || results.length === 1, 'Expected 0 or 1 results');
        if (results.length === 0)
            return;
        const game = results[0];
        assert(game.opponent instanceof Tp.Value.Entity);
    }]
];
