// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');
const GenericSource = require('./generic');

const _submodules = {
    'off': GenericSource('Off', '/off/%s/%s', 2),
    'you': GenericSource('You', '/you/%s/%s', 2),
    'this': GenericSource('This', '/this/%s', 1),
    'that': GenericSource('That', '/that/%s', 1),
    'everything': GenericSource('Everything', '/everything/%s', 1),
    'everyone': GenericSource('Everyone', '/everyone/%s', 1),
    'donut': GenericSource('Donut', '/donut/%s/%s', 1),
    'shakespeare': GenericSource('Shakespeare', '/shakespeare/%s/%s', 2)
}

module.exports = new Tp.DeviceClass({
    Name: 'FoaasDevice',

    _init: function(engine, state) {
        this.parent(engine, state);

        this.uniqueId = 'com.foaas';
        this.name = "FOAAS";
        this.description = "Fuck Off As A Service";
    },

    checkAvailable: function() {
        return Tp.Availability.AVAILABLE;
    },

    getQueryClass: function(id) {
        if (id in _submodules)
            return _submodules[id];
        else
            throw new Error('Invalid query ' + id);
    }
});

