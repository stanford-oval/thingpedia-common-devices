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
    }

    get kind() {
        return 'com.nest.security_camera';
    }

    get name() {
        return 'Nest Camera ' + this.state.name;
    }

    get description() {
        return 'This is your ' + this.state.name_long;
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
};
CameraDevice.metadata = {
    types: ['security-camera']
};

module.exports = CameraDevice;