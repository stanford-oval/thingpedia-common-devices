// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Silei Xu <silei@cs.stanford.edu>
//
// See LICENSE for details

"use strict";

const Tp = require("thingpedia");

module.exports = {
    createTpEntity(team, abbreviation) {
        return new Tp.Value.Entity(team[abbreviation].toLowerCase(), team.name);
    },
};
