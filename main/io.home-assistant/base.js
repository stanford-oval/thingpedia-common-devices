// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of io.home-assistant
//
// Copyright 2019 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Stream = require('stream');

const Tp = require('thingpedia');
const HomeAssistant = require('home-assistant-js-websocket');

module.exports = class HomeAssistantDevice extends Tp.BaseDevice {
    constructor(engine, state, master, entityId) {
        super(engine, state);

        this.master = master;
        this._entityId = entityId;
        this.uniqueId = master.uniqueId + '/' + entityId;
        this.name = this.state.attributes.friendly_name;
        this.isTransient = true;

        this._clock = 0;
    }

    // note: some versions of the thingpedia library don't emit "state-changed"
    // in updateState(), and some do, hence we don't chain up here, to avoid
    // double emission
    updateState(state) {
        this.state = state;
        this.name = this.state.attributes.friendly_name;
        this.emit('state-changed');
    }

    _callService(domain, service, data = {}) {
        data.entity_id = this._entityId;
        return HomeAssistant.callService(this.master.connection, domain, service, data);
    }

    _lamportClock() {
        let now = Date.now();
        if (now < this._clock)
            now = this._clock+1;
        this._clock = now;
        return now;
    }

    _subscribeState(callback) {
        const stream = new Stream.Readable({
            objectMode: true,

            read() {}
        });

        const listener = () => {
            const newEvent = callback();
            if (newEvent) {
                // ensure that all events have different, monotonically increasing timestamps
                // otherwise the edge-trigger logic will be confused
                newEvent.__timestamp = this._lamportClock();
                stream.push(newEvent);
            }
        };
        stream.destroy = () => {
            this.removeListener('state-changed', listener);
        };
        this.on('state-changed', listener);

        return stream;
    }
};
