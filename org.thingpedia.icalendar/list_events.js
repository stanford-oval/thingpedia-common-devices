// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//                Daniel Melendez <dmelende@stanford.edu>
//
// See COPYING for details
"use strict";

const ICalendar = require('ical.js');
const Tp = require('thingpedia');

module.exports = new Tp.ChannelClass({
    Name: 'iCalendarListEventsChannel',

    _init(engine, device, params) {
        this.parent(engine, device);
        this.url = device.url;
    },

    formatEvent(event, filters) {
        var startDate = event[0];
        var endDate = event[1];
        var summary = event[2];
        var description = event[3];
        var sequence = event[4];
        var organizer = event[5];
        var location = event[6];

        var message;
        if (location && organizer)
            message = "%s (%s, organized by %s)".format(summary, location, organizer);
        else if (location)
            message = "%s (%s)".format(summary, location);
        else if (organizer)
            message = "%s (organized by %s)".format(summary, organizer);
        else
            message = summary;

        var locale = this.engine.platform.locale;
        var timezone = this.engine.platform.timezone;
        var time;
        if (endDate) {
            time = "Runs from %s to %s".format(startDate.toLocaleString(locale, { timeZone: timezone }),
                                               endDate.toLocaleString(locale, { timeZone: timezone }));
        } else {
            time = "Starts at %s".format(startDate.toLocaleString(locale, { timeZone: timezone }));
        }

        return [message, time];
    },

    invokeQuery(filters) {
        return Tp.Helpers.Http.get(this.url).then((data) => {
            var jcalData = ICAL.parse(data);
            var comp = new ICAL.Component(jcalData);
            var vevents = comp.getAllSubcomponents("vevent");

            var now = Date.now();
            var events = [];
            for (var i = 0; i < vevents.length; i++) {
                var vevent = vevents[i];
                var icalEvent = new ICAL.Event(vevent)
                if (!icalEvent)
                    continue;
                var startDate = icalEvent.startDate;
                if (!startDate)
                    continue;
                var jsStartDate = startDate.toJSDate();
                if (now > jsStartDate.getTime())
                   continue;

                events.push(icalEvent);
            }

            events.sort(function(a, b) {
                return a.startDate.getTime() - b.startDate.getTime();
            });

            return events.map((event) => {
                return [event.startDate.toJSDate(),
                        event.endDate ? event.endDate.toJSDate() : null,
                        event.summary,
                        event.description,
                        event.sequence,
                        event.organizer,
                        event.location];
            });
        });
    },
});
