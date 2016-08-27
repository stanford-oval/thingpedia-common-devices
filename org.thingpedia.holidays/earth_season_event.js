// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//                Daniel Melendez <dmelende@stanford.edu>
//
// See COPYING for details

const Source = require('./source');

const EARTH_SEASONS_CALENDAR_URL = "http://www.herskal.com/calendars/EarthSeasons.ics";

module.exports = Source('EarthSeasonsPoll',
    EARTH_SEASONS_CALENDAR_URL,
    function format(event) {
        var date = event[0];
        var summary = event[1];
        var description = event[2];

        if (description)
            return ["Today's the %s".format(summary), description];
        else
            return "Today's the %s".format(summary);
    });
