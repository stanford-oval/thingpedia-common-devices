// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of io.home-assistant
//
// Copyright 2019 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');
const HomeAssistant = require('home-assistant-js-websocket');

module.exports = class HomeAssistantDevice extends Tp.BaseDevice {
    constructor(engine, state, master, entityId) {
        super(engine, state);

        this.master = master;
        this._entityId = entityId;
        this.uniqueId = master.uniqueId + '/' + entityId;
        this.name = this.state.attributes.friendly_name;
    }

    updateState(state) {
        super.updateState(state);
        this.name = this.state.attributes.friendly_name;
    }

    _callService(domain, service, data = {}) {
        data.entity_id = this._entityId;
        return HomeAssistant.callService(this.master.connection, domain, service, data);
    }
};
