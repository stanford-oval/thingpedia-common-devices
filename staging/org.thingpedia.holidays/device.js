// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//                Daniel Melendez <dmelende@stanford.edu>
//
// See COPYING for details
"use strict";

const Tp = require('thingpedia');
const ICAL = require('ical.js');

const url = "https://calendar.google.com/calendar/ical/en.COUNTRY%23holiday@group.v.calendar.google.com/public/basic.ics";

const country_code = {
    'us': 'usa',
    'uk': 'uk',
    'it': 'italian',
    'cn': 'china',
    'au': 'australian',
    'at': 'austrian',
    'be': 'be',
    'br': 'brazilian',
    'ca': 'canadian',
    'hr': 'croatian',
    'dk': 'danish',
    'fi': 'finnish',
    'fr': 'french',
    'de': 'german',
    'gr': 'greek',
    'hk': 'hong_kong',
    'hu': 'hungarian',
    'is': 'is',
    'in': 'indian',
    'ie': 'irish',
    'lt': 'lithuanian',
    'mo': 'mo',
    'nl': 'dutch',
    'no': 'norwegian',
    'pl': 'polish',
    'pt': 'portuguese',
    'ro': 'romanian',
    'ru': 'russian',
    'sg': 'singapore',
    'si': 'slovenian',
    'es': 'spain',
    'se': 'swedish',
    'ch': 'ch',
    'tw': 'taiwan',
    'tr': 'turkish',

};

module.exports = class ICalendarHolidaysDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);

        this.name = "Holidays";
        this.description = "Checks for holiday events of a region.";
        this.uniqueId = 'org.thingpedia.holidays';
    }

    get_get_holidays({ country }) {
        country = String(country || 'us');
        if (!(country in country_code))
            throw Error('The country is not supported.');

        return Tp.Helpers.Http.get(url.replace('COUNTRY', country_code[country])).then((data) => {
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
