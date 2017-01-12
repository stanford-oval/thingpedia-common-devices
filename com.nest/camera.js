// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

const Query = require('./query');
const Source = require('./source');
const Sink = require('./sink');

const CameraSetPowerAction = Sink('CameraSetPower', function(firebase, event) {
    return firebase.update({ is_streaming: !!event[0] });
});

const CameraWebUrlQuery = Query('CameraWebUrl', function(firebase, event) {
    return [[firebase.web_url]];
}, function(event, filters, hint, formatter) {
    var url = event[0];

    if (hint === 'string-title')
        return "Security Camera Live Feed";
    else if (hint === 'string-body')
        return url;
    // else fall through

    return [{
        type: 'rdl',
        displayTitle: "Security Camera Live Feed",
        callback: url,
        webCallback: url
        }];
});

const CameraGetSnapshotQuery = Query('CameraSnapshotQuery', function(firebase, event) {
    return [[firebase.snapshot_url]];
}, function(event, filters, hint, formatter) {
    var url = event[0];

    if (hint && hint.startsWith('string'))
        return ["Security Camera Snapshot", url];
    // else fall through

    return [{
        type: 'picture',
        url: url
        }];
});

const CameraNewEventTrigger = new Tp.ChannelClass({
    Name: 'NestCameraNewEventChannel',
    RequiredCapabilities: ['channel-state'],

    _init: function(engine, state, device) {
        this.parent(engine, device);

        this.device = device;
        this.state = state;
        this.master = device.master;

        this._valueListener = this._onValue.bind(this);
    },

    formatEvent: function(event, hint, formatter) {
        var time = event[0];
        var hasSound = event[1];
        var hasMotion = event[2];
        var hasPerson = event[3];
        var gifUrl = event[4];

        var locale = this.engine.platform.locale;
        var timezone = this.engine.platform.timezone;
        var timeString = time.toLocaleString(locale, { timeZone: timezone });

        var title;
        if (hasSound && hasMotion)
            title = "Sound and motion detected on your camera at %s".format(timeString);
        else if (hasSound)
            title = "Sound detected on your camera at %s".format(timeString);
        else if (hasMotion)
            title = "Motion detected on your camera at %s".format(timeString);
        else
            title = "Something detected on your camera at %s".format(timeString);

        return [title, { type: 'picture', url: gifUrl }];
    },

    _doOpen: function() {
        this._firebase = this.master.refFirebaseClient().child(this.device.url).child('last_event');
        this._firebase.on('value', this._valueListener);
    },

    _doClose: function() {
        this._firebase.off('value', this._valueListener);
        this.master.unrefFirebaseClient();
        this._firebase = null;
    },

    _onValue: function(snapshot) {
        var data = snapshot.val();
        console.log('last_event', data);
        if (!data.end_time)
            return;
        var lastEvent = this.state.get('last-event-end-time');
        if (lastEvent === data.end_time)
            return;

        this.state.set('last-event-end-time', data.end_time);
        this.emitEvent([new Date(data.start_time), !!data.has_sound, !!data.has_motion, !!data.has_person, data.animated_image_url]);
    }
});

const CameraDevice = new Tp.DeviceClass({
    Name: 'NestCameraDevice',

    _init: function(engine, state, url, master) {
        this.parent(engine, state);

        this.master = master;
        this.url = url;
        this.uniqueId = 'com.nest-' + state.device_id;
        this.isTransient = true;
    },

    get kind() {
        return 'com.nest';
    },

    get name() {
        return 'Nest Camera ' + this.state.name;
    },

    get description() {
        return 'This is your ' + this.state.name_long;
    },

    checkAvailable: function() {
        return this.state.is_online ? Tp.Availability.AVAILABLE :
            Tp.Availability.UNAVAILABLE;
    },

    getTriggerClass: function(id) {
        switch(id) {
        case 'new_event':
            return CameraNewEventTrigger;
        default:
            throw new Error('Invalid channel ' + id);
        }
    },

    getActionClass: function(id) {
        switch(id) {
        case 'set_power':
            return CameraSetPowerAction;
        default:
            throw new Error('Invalid channel ' + id);
        }
    },

    getQueryClass: function(id) {
        switch(id) {
        case 'get_url':
            return CameraWebUrlQuery;
        case 'get_snapshot':
            return CameraGetSnapshotQuery;
        default:
            throw new Error('Invalid channel ' + id);
        }
    }
});
CameraDevice.metadata = {
    types: ['security-camera']
};

module.exports = CameraDevice;
