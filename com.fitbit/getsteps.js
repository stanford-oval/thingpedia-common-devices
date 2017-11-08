// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2017 Rakesh Ramesh <rakeshr@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');
// const Date = require('Date');

const URL_BASE = 'https://api.fitbit.com/1/user/';

function getDateString(date) {
    var dateString = date.getFullYear() + '-' + (date.getMonth()+1) + '-' + date.getDate();
    return dateString;
}

module.exports = new Tp.ChannelClass({
    Name: 'GetStepsFitbit',

    _init: function(engine, device, params) {
        this.parent();
        this.device = device;
        this.url = URL_BASE + this.device.userId + '/activities/date/';
    },

    formatEvent: function(event, filters) {
        var eventString = 'Steps on ' + event[0].toDateString() + ' : ' + event[1];
        return eventString;
    },

    invokeQuery: function(filters) {
        var date = filters[0];
        if(date == undefined) {
            date = new Date(Date.now());
        }

        var getUrl = this.url + getDateString(date) + ".json";
        return Tp.Helpers.Http.get(getUrl, { useOAuth2: this.device, accept: 'application/json'}).then(function(response) {
            try {
                var parsed = JSON.parse(response);
                console.log(parsed);
                var steps = parsed.summary.steps;
                return [[date, steps]];
            } catch(e) {
                console.error("Got error parsing response: " + e);
                return;
            }
        });
    }
});