// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Source = require('./source');

module.exports = Source('moves', 'move', function(event) {
    return [event.time_updated * 1000, event.date, event.distance * 1000, event.steps,
            event.active_time * 1000, event.inactive_time * 1000,
            event.calories];
});
