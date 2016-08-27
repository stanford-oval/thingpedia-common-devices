// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//                Daniel Melendez <dmelende@stanford.edu>
//
// See COPYING for details

const Tp = require('thingpedia');

module.exports = new Tp.DeviceClass({
    Name: 'iCalendarHolidaysDevice',

    _init: function(engine, state) {
        this.parent(engine, state);

        this.name = "Holidays";
        this.description = "Checks for holiday events of a region.";
        this.uniqueId = 'org.thingpedia.holidays';
    }
});
