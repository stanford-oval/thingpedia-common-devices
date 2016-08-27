// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//                Daniel Melendez <dmelende@stanford.edu>
//
// See COPYING for details

const Query = require('./query');

const UNITED_STATES_HOLIDAY_CALENDAR_URL = "https://calendar.google.com/calendar/ical/en.usa%23holiday@group.v.calendar.google.com/public/basic.ics";

module.exports = Query('USHolidayCalendar',
    UNITED_STATES_HOLIDAY_CALENDAR_URL,
    function format(event) {
        var date = event[0];
        var summary = event[1];
        var description = event[2];

        var locale = this.engine.platform.locale;
        var timezone = this.engine.platform.timezone;
        var dateStr = date.toLocaleDateString(locale, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
            timeZone: timezone
        });
        if (description)
            return ["Next US holiday: %s on %s".format(summary, dateStr), description];
        else
            return "Next US holiday: %s on %s".format(summary, dateStr);
    });
