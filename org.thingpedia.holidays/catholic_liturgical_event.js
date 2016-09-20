// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//                Daniel Melendez <dmelende@stanford.edu>
//
// See COPYING for details

const Source = require('./source');

const CATHOLIC_LITURGICAL_CALENDAR_URL = "http://www.newsfromgod.com/ologgio/liturgical.ics";

module.exports = Source('CatholicLiturgicalCalendarEvent',
    CATHOLIC_LITURGICAL_CALENDAR_URL,
    function format(event) {
        var date = event[0];
        var summary = event[1];
        var description = event[2];

        if (description)
            return ["Today's Catholic liturgy: %s".format(summary), description];
        else
            return ["Today's Catholic liturgy: %s".format(summary)];
    });

