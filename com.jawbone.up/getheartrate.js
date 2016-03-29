// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const Poll = require('./poll');

const POLL_INTERVAL = 300 * 1000; // 5m

module.exports = Poll('heartrates', POLL_INTERVAL, function(event) {
    return [event.time_updated * 1000, { x: event.place_lon, y: event.place_lat },
            event.resting_heartrate];
});
