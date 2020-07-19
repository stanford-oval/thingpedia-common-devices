// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016-2018 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Stream = require('stream');
const Tp = require('thingpedia');

const CameraDevice = class NestCameraDevice extends Tp.BaseDevice {
    constructor(engine, state, url, master) {
        super(engine, state);

        this.master = master;
        this.url = url;
        this.uniqueId = 'com.nest-' + state.device_id;
        this.isTransient = true;

        this.name = 'Nest Camera ' + this.state.name;
        this.description = 'This is your ' + this.state.name_long;
    }

    get kind() {
        return 'com.nest.security_camera';
    }

    checkAvailable() {
        return this.state.is_online ? Tp.Availability.AVAILABLE :
            Tp.Availability.UNAVAILABLE;
    }

    subscribe_current_event(params, state) {
        const stream = new Stream.Readable({ objectMode: true, read() {} });
        const firebase = this.master.refFirebaseClient().child(this.url).child('last_event');
        const listener = (snapshot) => {
            const data = snapshot.val();
            if (!data.start_time)
                return;
            const lastEvent = state.get('last-event-end-time');
            if (lastEvent === data.start_time)
                return;

            state.set('last-event-end-time', data.start_time);
            stream.push({
                start_time: new Date(data.start_time),
                has_sound: !!data.has_sound,
                has_motion: !!data.has_motion,
                has_person: !!data.has_person,
                picture_url: data.animated_image_url || this.state.snapshot_url
            });
        };
        firebase.on('value', listener);
        stream.destroy = () => {
            firebase.off('value', listener);
            this.master.unrefFirebaseClient();
        };

        return stream;
    }

    get_current_event() {
        return new Promise((resolve, reject) => {
            let firebase = this.master.refFirebaseClient().child(this.url);
            let lastEvent = firebase.child('last_event');
            lastEvent.once('value', (snapshot) => {
                const data = snapshot.val();
                console.log('last_event', data);
                resolve([{
                    start_time: new Date(data.start_time),
                    has_sound: !!data.has_sound,
                    has_motion: !!data.has_motion,
                    has_person: !!data.has_person,
                    picture_url: data.animated_image_url || this.state.snapshot_url
                }]);
                this.master.unrefFirebaseClient();
            });
        });
    }

    do_set_power({ power }) {
        const firebase = this.master.refFirebaseClient().child(this.url);
        firebase.update({ is_streaming: !!power });
        this.master.unrefFirebaseClient();
        return Promise.resolve();
    }

    _get_specific_sensor(sensor) {
        return new Promise((resolve, reject) => {
            let firebase = this.master.refFirebaseClient().child(this.url);
            let lastEvent = firebase.child('last_event');
            lastEvent.once('value', (snapshot) => {
                const data = snapshot.val();
                console.log('last_event', data);
                const sensor_mapping = {
                    sound: data.has_sound ? "detecting" : "not_detecting",
                    motion: data.has_motion ? "detecting" : "not_detecting",
                    occupancy: data.has_person ? "detecting" : "not_detecting",
                };
                resolve([{state: sensor_mapping[sensor]}]);
                this.master.unrefFirebaseClient();
            });
        });
    }

    _subscribe_specific_sensor(params, state, sensor) {
        const stream = new Stream.Readable({ objectMode: true, read() {} });
        const firebase = this.master.refFirebaseClient().child(this.url).child('last_event');
        const listener = (snapshot) => {
            const data = snapshot.val();
            if (!data.start_time)
                return;
            const lastEvent = state.get('last-event-end-time');
            if (lastEvent === data.start_time)
                return;
            state.set('last-event-end-time', data.start_time);
            const sensor_mapping = {
                sound: data.has_sound ? "detecting" : "not_detecting",
                motion: data.has_motion ? "detecting" : "not_detecting",
                occupancy: data.has_person ? "detecting" : "not_detecting",
            };
            stream.push({state: sensor_mapping[sensor]});
        };
        firebase.on('value', listener);
        stream.destroy = () => {
            firebase.off('value', listener);
            this.master.unrefFirebaseClient();
        };
        return stream;
    }

    get_motion() {
        return this._get_specific_sensor("motion");
    }
    
    subscribe_motion(params, state) {
        return this._subscribe_specific_sensor(params, state, "motion");
    }

    get_occupancy() {
        return this._get_specific_sensor("occupancy");
    }
    
    subscribe_occupancy(params, state) {
        return this._subscribe_specific_sensor(params, state, "occupancy");
    }

    get_sound() {
        return this._get_specific_sensor("sound");
    }
    
    subscribe_sound(params, state) {
        return this._subscribe_specific_sensor(params, state, "sound");
    }
};
CameraDevice.metadata = {
    types: ['security-camera']
};

module.exports = CameraDevice;
