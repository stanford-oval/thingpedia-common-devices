// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//                Daniel Melendez <dmelende@stanford.edu>
//
// See COPYING for details
"use strict";

const Tp = require('thingpedia');
const ICAL = require('ical.js');

module.exports = class ICalendarHolidaysDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);

        this.name = "Holidays";
        this.description = "Checks for holiday events of a region.";
        this.uniqueId = 'org.thingpedia.holidays';
    }

    get_get_holidays({ country }) {
        country = String(country);
        let url;
        if (country === 'us')
            url = "https://calendar.google.com/calendar/ical/en.usa%23holiday@group.v.calendar.google.com/public/basic.ics";
        else if (country === 'uk')
            url = "https://calendar.google.com/calendar/ical/en_gb.uk%23holiday@group.v.calendar.google.com/public/basic.ics";
        else if (country === 'it')
            url = "https://calendar.google.com/calendar/ical/en.italian%23holiday%40group.v.calendar.google.com/public/basic.ics";
        else // put the country there and hope for the best...
            url = "https://calendar.google.com/calendar/ical/it." + country + "%23holiday%40group.v.calendar.google.com/public/basic.ics";

        return Tp.Helpers.Http.get(url).then((data) => {
            const jcalData = ICAL.parse(data);
            const comp = new ICAL.Component(jcalData);
            const vevents = comp.getAllSubcomponents("vevent");

            const now = new Date();
            // force today to 0:0:0
            now.setHours(0,0,0,0);

            // find the events that start later than now
            const result = vevents.map((vevent) => {
                const icalEvent = new ICAL.Event(vevent);
                if (!icalEvent)
                    return null;
                const startDate = icalEvent.startDate;
                if (!startDate)
                    return null;
                const jsStartDate = startDate.toJSDate();
                jsStartDate.setHours(0,0,0,0);
                if (now > jsStartDate.getTime())
                    return null;
                return {
                    date: jsStartDate,
                    summary: icalEvent.summary,
                    description: icalEvent.description
                };
            }).filter((ev) => ev !== null);

            result.sort((a, b) => a.date - b.date);
            return result;
        });
    }
};
