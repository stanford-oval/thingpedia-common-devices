"use strict";

const Tp = require('thingpedia');

module.exports = {
    createTpEntity(team) {
        return new Tp.Value.Entity(team.alias.toLowerCase(), team.name);
    }
};
