// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const Source = require('./source');

const POLL_INTERVAL = 1800 * 1000; // 30m

module.exports = Source('moves', POLL_INTERVAL, function(event) {
    return [event.time_updated * 1000, event.date, event.distance, event.steps,
            event.active_time * 1000, event.inactive_time * 1000,
            event.calories];
});
