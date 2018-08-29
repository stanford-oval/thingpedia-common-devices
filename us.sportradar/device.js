// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//           2016 Riad S. Wahby <rsw@cs.stanford.edu> - extended with additional sports
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

const mlb = require('./mlb_team');

module.exports = class SportRadarDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);

        this.uniqueId = 'us.sportradar';
        this.name = "SportRadar";
        this.description = "SportRadar is a quick source of Sport Results and info and stuff. Supports NFL, NBA, European and USA Soccer, MLB, NCAAFB, and NCAAMBB.";
    }

    get_mlb({ team }) {
        return mlb.get(this.constructor.metadata.auth.api_key_mlb, team);
    }

    get_soccer_eu_tourney() {
        throw new Error('not implemented yet');
    }
    get_soccer_us_tourney() {
        throw new Error('not implemented yet');
    }
    get_nba() {
        throw new Error('not implemented yet');
    }
    get_soccer_eu() {
        throw new Error('not implemented yet');
    }
    get_soccer_us() {
        throw new Error('not implemented yet');
    }
    get_ncaambb() {
        throw new Error('not implemented yet');
    }
    get_ncaafb() {
        throw new Error('not implemented yet');
    }
};
