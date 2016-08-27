// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//                Daniel Melendez <dmelende@stanford.edu>
//
// See COPYING for details

const Query = require('./query');

const CATHOLIC_LITURGICAL_CALENDAR_URL = "http://www.newsfromgod.com/ologgio/liturgical.ics";

module.exports = Query('NextCatholicLiturgicalCalendarEvent',
    CATHOLIC_LITURGICAL_CALENDAR_URL,
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
            return ["Next Catholic liturgy event: %s on %s".format(summary, dateStr), description];
        else
            return "Next Catholic liturgy event: %s on %s".format(summary, dateStr);
    });

