// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Silei Xu <silei@stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');
const EmailReceiver = require('./receive_email_base');

module.exports = EmailReceiver('GMailPollingTrigger', 'category:primary',
    function (event, filters) {
        return event[event.length-1];
    },
    function(event) {
        this.emitEvent(event);
    }
);



