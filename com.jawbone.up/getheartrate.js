// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const Source = require('./source');

const POLL_INTERVAL = 6 * 3600 * 1000; // 6h

module.exports = Source('heartrates', POLL_INTERVAL, function(event) {
    return [event.time_updated * 1000, { x: event.place_lon, y: event.place_lat },
            event.resting_heartrate];
});
