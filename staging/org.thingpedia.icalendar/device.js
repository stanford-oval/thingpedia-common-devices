// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//                Daniel Melendez <dmelende@stanford.edu>
//
// See COPYING for details
"use strict";

const Tp = require('thingpedia');
const ICAL = require('ical.js');

module.exports = class ICalendarDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);

        this.uniqueId = 'org.thingpedia.icalendar-' + this.url;
        this.name = "iCalendar at " + this.url;
        this.description = "Checks for events";
    }

    get url() {
        return this.state.url;
    }

    get_list_events() {
        return Tp.Helpers.Http.get(this.url).then((data) => {
            const jcalData = ICAL.parse(data);
            const comp = new ICAL.Component(jcalData);
            const vevents = comp.getAllSubcomponents("vevent");

            const now = new Date();

            // find the events that start later than now
            const result = vevents.map((vevent) => {
                const icalEvent = new ICAL.Event(vevent);
                if (!icalEvent)
                    return null;
                const startDate = icalEvent.startDate;
                if (!startDate)
                    return null;
                const endDate = icalEvent.endDate;
                const jsStartDate = startDate.toJSDate();
                const jsEndDate = endDate ? endDate.toJSDate() : null;

                let status;
                if (now < jsStartDate - 15*60000) // 15 minutes before
                    status = 'scheduled';
                else if (now < jsStartDate)
                    status = 'upcoming';
                else if (jsEndDate && now < jsEndDate)
                    status = 'started';
                else
                    status = 'ended';

                return {
                    start_date: jsStartDate,
                    end_date: jsEndDate,
                    summary: icalEvent.summary,
                    description: icalEvent.description,
                    sequence: icalEvent.sequence,
                    organizer: icalEvent.organizer || '',
                    location: icalEvent.location || '',
                    status
                };
            }).filter((ev) => ev !== null);

            result.sort((a, b) => a.date - b.date);
            return result;
        });
    }
};
