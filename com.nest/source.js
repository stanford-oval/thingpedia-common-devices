// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

module.exports = function(name, makeEvent) {
    return new Tp.ChannelClass({
        Name: 'Nest' + name + 'Channel',

        _init: function(engine, device) {
            this.parent();

            this.device = device;
            this.master = device.master;

            this._valueListener = this._onValue.bind(this);
        },

        _doOpen: function() {
            this._firebase = this.master.refFirebaseClient().child(this.device.url);
            this._firebase.on('value', this._valueListener);
        },

        _doClose: function() {
            this._firebase.off('value', this._valueListener);
            this.master.unrefFirebaseClient();
            this._firebase = null;
        },

        _onValue: function(snapshot) {
            makeEvent.call(this, snapshot.val());
        }
    });
}
