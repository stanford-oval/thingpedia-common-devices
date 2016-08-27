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

        _init: function(engine, device, params) {
            this.parent(engine, device);
            this.url = url;
        },

        formatEvent: format,

        invokeQuery(filters) {
            return Tp.Helpers.Http.get(this.url).then((data) => {
                var jcalData = ICAL.parse(data);
                var comp = new ICAL.Component(jcalData);
                var vevents = comp.getAllSubcomponents("vevent")

                var now = new Date();
                // force today to 0:0:0
                now.setHours(0,0,0,0);

                // find the next event that starts later than now
                var mindate = Infinity;
                var event = null;
                for (var i = 0; i < vevents.length; i++) {
                    var vevent = vevents[i];
                    var icalEvent = new ICAL.Event(vevent)
                    if (!icalEvent)
                        continue;
                    var startDate = icalEvent.startDate;
                    if (!startDate)
                        continue;
                    var jsStartDate = startDate.toJSDate();
                    jsStartDate.setHours(0,0,0,0);
                    if (now > jsStartDate.getTime())
                        continue;

                    if (jsStartDate.getTime() < mindate) {
                        mindate = jsStartDate.getTime();
                        event = icalEvent;
                    }
                }

                return [[event.startDate.toJSDate(), event.summary, event.description]];
            });
        }
    });
}
