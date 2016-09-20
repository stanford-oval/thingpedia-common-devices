// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//                Daniel Melendez <dmelende@stanford.edu>
//
// See COPYING for details

const Source = require('./source');

const UNITED_STATES_HOLIDAY_CALENDAR_URL = "https://calendar.google.com/calendar/ical/en.usa%23holiday@group.v.calendar.google.com/public/basic.ics";

module.exports = Source('USHolidayCalendar',
    UNITED_STATES_HOLIDAY_CALENDAR_URL,
    function format(event) {
        var date = event[0];
        var summary = event[1];
        var description = event[2];

        if (description)
            return ["Today's %s".format(summary), description];
        else
            return ["Today's %s".format(summary)];
    });
