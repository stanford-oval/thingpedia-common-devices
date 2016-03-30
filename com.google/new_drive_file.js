// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingPedia
//
// Copyright 2016 Linyu He <linyu90@stanford.edu>
//                Lingbin Li <lingbin@stanford.edu>
//
// See COPYING for details

const Tp = require('thingpedia');

const INTERVAL = 60000;
const PAGE_SIZE = 10;

module.exports = new Tp.ChannelClass({
    Name: 'GoogleDocsPollingTrigger',
    Extends: Tp.HttpPollingTrigger,
    RequiredCapabilities: ['channel-state'],
    interval: INTERVAL,

    _init: function(engine, state, device) {
        this.parent();
        this.device = device;
        this.url = 'https://www.googleapis.com/drive/v3/files?orderBy=createdTime desc&pageSize=' + PAGE_SIZE;
        this.state = state;
    },

    get auth() {
        return 'Bearer ' + this.device.accessToken;
    },

    _onResponse: function(response) {
        var parsedResponse = JSON.parse(response);
        var result = [];
        for (var i = 0; i < PAGE_SIZE; i++) {
            var id = parsedResponse.files[i].id;
            var name = parsedResponse.files[i].name;

            if (this.state.get(id) == null) {
                this.state.set(id, name);
                result.push(name);
            }
        }

        if (this.state.get('everRead')) {
            result.forEach(function(name) {
                this.emitEvent([name]);
            }, this);
        }

        if (this.state.get('everRead') === undefined)
            this.state.set('everRead', true);
    }
});
