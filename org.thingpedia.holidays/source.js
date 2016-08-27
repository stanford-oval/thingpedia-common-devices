// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//                Daniel Melendez <dmelende@stanford.edu>
//
// See COPYING for details

const ICalendar = require('ical.js');
const Tp = require('thingpedia');

const POLL_INTERVAL = 24 * 3600 * 1000; // 1 day

module.exports = function(name, url, format) {
    return new Tp.ChannelClass({
        Name: name,
        Extends: Tp.HttpPollingTrigger,
        interval: POLL_INTERVAL,

        _init(engine, device, params) {
            this.parent(engine, device);
            this.url = url;
        },

        formatEvent: format,

        _onResponse(data) {
            if (!data)
                return;

            var jcalData = ICAL.parse(data);
            var comp = new ICAL.Component(jcalData);
            var vevents = comp.getAllSubcomponents("vevent")

            var currentDate = new Date()

            //find time difference so that the next poll is tomorrow
            var tomorrow = new Date()
            tomorrow.setDate(currentDate.getDate() + 1)
            tomorrow.setHours(0, 0, 0, 0)
            var timeDiff = tomorrow.getTime() - currentDate.getTime()
            this.interval = Math.max(timeDiff, 5000);

            // hour doesn't matter, just need to make sure its the same day
            currentDate.setHours(0, 0, 0, 0);

            var events = [];
            for (i = 0; i < vevents.length; i++) {
                var vevent = vevents[i];
                var icalEvent = new ICAL.Event(vevent)
                if (icalEvent == null)
                    continue;
                var startDate = icalEvent.startDate;
                if (startDate == null)
                    continue;
                var jsStartDate = startDate.toJSDate()
                jsStartDate.setHours(0, 0, 0, 0);
                if (currentDate.getTime() === jsStartDate.getTime()) {
                    events.push(icalEvent);
                    console.log('Found holiday ' + icalEvent.summary);
                }
            }

            events.forEach((event) => {
                return [event.startDate.toJSDate(),
                        event.summary,
                        event.description];
            });
        }
    });
}
