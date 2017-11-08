// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//                Daniel Melendez <dmelende@stanford.edu>
//
// See COPYING for details
"use strict";

const ICalendar = require('ical.js');
const Tp = require('thingpedia');

const POLL_INTERVAL = 3 * 3600 * 1000; // 3 hours

module.exports = new Tp.ChannelClass({
    Name: 'iCalendarEventBeginChannel',
    Extends: Tp.HttpPollingTrigger,
    interval: POLL_INTERVAL,

    _init: function(engine, device, params) {
        this.parent(engine, device);
        this.url = device.url;
        this.interval = POLL_INTERVAL;
    },

    formatEvent(event, filters) {
        var startDate = event[0];
        var endDate = event[1];
        var summary = event[2];
        var description = event[3];
        var sequence = event[4];
        var organizer = event[5];
        var location = event[6];

    // FIXME: Convert the string to a location and return it

    // @JsonIgnoreProperties({ "boundingbox", "licence" })
    //     private static class NominatimEntry {
    //         @JsonProperty
    //         public String category;
    //         @JsonProperty
    //         public String display_name;
    //         @JsonProperty
    //         public String icon;
    //         @JsonProperty
    //         public double importance;
    //         @JsonProperty
    //         public double lat;
    //         @JsonProperty
    //         public double lon;
    //         @JsonProperty
    //         public String osm_id;
    //         @JsonProperty
    //         public String osm_type;
    //         @JsonProperty
    //         public String place_id;
    //         @JsonProperty
    //         public String place_rank;
    //         @JsonProperty
    //         public String type;
    //     }
    //
    //     private static final String URL_TEMPLATE = "http://nominatim.openstreetmap.org/search/?format=jsonv2&accept-language=%s&limit=5&q=%s";

        var message;
        if (location && organizer)
            message = "Event starting: %s (%s, organized by %s)".format(summary, location, organizer);
        else if (location)
            message = "Event starting: %s (%s)".format(summary, location);
        else if (organizer)
            message = "Event starting: %s (organized by %s)".format(summary, organizer);
        else
            message = summary;

        var locale = this.engine.platform.locale;
        var timezone = this.engine.platform.timezone;
        var time;
        if (endDate) {
            time = "Ends at %s".format(endDate.toLocaleString(locale, { timeZone: timezone }));
            return [message, time, description];
        } else {
            return [message, description];
        }
    },

    _onResponse: function(data) {
        if (!data)
            return;

        var jcalData = ICAL.parse(data);
        var comp = new ICAL.Component(jcalData);
        var vevents = comp.getAllSubcomponents("vevent")

        var now = Date.now();

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
            if (now > jsStartDate.getTime())
                continue;

            if (jsStartDate.getTime() < mindate) {
                mindate = jsStartDate.getTime();
                event = icalEvent;
            }
        }

        // warn 1 minute before the event
        mindate -= 60000;

        var interval = now - mindate;
        if (interval < 1000)
            interval = 1000;
        setTimeout(() => {
            this.emitEvent([event.startDate.toJSDate(),
                            event.endDate ? event.endDate.toJSDate() : null,
                            event.summary,
                            event.description,
                            event.sequence,
                            event.organizer,
                            event.location]);

            this._onTick().done();
        }, interval);
    },
});
