// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 {jasonf2, kkiningh}@stanford.edu
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');
const Interval = 5 * 60 * 1000; // 5 min

module.exports = new Tp.ChannelClass({
    Name: 'OneDriveFileCreatedTrigger',
    Extends: Tp.HttpPollingTrigger,
    RequiredCapabilities: ['channel-state'],
    interval: Interval,

    _init: function(engine, state, device) {
        this.parent();
        this.device = device;
        this._state = state;

        this._baseurl = 'https://api.onedrive.com/v1.0/drive/root/view.delta';
        this.url = this._baseurl + "?token=latest";
    },

    get auth() {
        return "Bearer " + this.device.accessToken;
    },

    formatEvent(event) {
        var fileName = event[0];

        return "New file created: %s".format(fileName);
    },

    _onResponse(response) {
        var state = this._state;

        var parsed;
        try {
            parsed = JSON.parse(response);
        } catch(e) {
            console.log('Error parsing OneDrive server response: ' + e.message);
            console.log('Full response was');
            console.log(response);
            return;
        }

        var deltaToken = parsed["@delta.token"];
        this.url = this._baseurl + "?token=" + deltaToken;

        var value = parsed.value;
        var previousResponseDate = new Date(state.get('previousDate'));
        if (value.length) {
            var maxDate = new Date(value[0].createdDateTime);
            for (var i in value) {
                if (value[i].file && !value[i].deleted) {
                    var date = new Date(value[i].createdDateTime);
                    if (maxDate < date) {
                        maxDate = date;
                    }
                    if (previousResponseDate == undefined || previousResponseDate < date) {
                        this.emitEvent([value[i].name]);
                    }
                }
            }

            state.set('previousDate', maxDate.toString());
        }
    }
});
