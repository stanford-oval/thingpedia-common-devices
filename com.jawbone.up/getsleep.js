// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const Source = require('./source');

const POLL_INTERVAL = 3600 * 1000; // 1h

module.exports = Source('sleeps', POLL_INTERVAL, function(event) {
    return [event.time_updated * 1000, { x: event.place_lon, y: event.place_lat },
            event.details.awake_time * 1000, event.details.asleep_time * 1000,
            event.details.duration * 1000,
            event.details.rem * 1000, event.details.light * 1000,
            event.details.deep * 1000];
});
