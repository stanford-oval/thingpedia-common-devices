// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const Source = require('./source');

module.exports = Source('body_events', 'body', function(event) {
    return [event.time_updated * 1000, { x: event.place_lon, y: event.place_lat },
            event.weight, event.lean_mass, event.body_fat, event.bmi];
});
