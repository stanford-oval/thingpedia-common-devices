// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');
const ObjectSet = Tp.ObjectSet;

class NestDeviceCollection extends ObjectSet.Simple {
    constructor(device, path, constructor) {
        super(false);
        this._device = device;
        this._path = path;
        this._childConstructor = constructor;

        this._childAddedListener = this._onChildAdded.bind(this);
        this._childRemovedListener = this._onChildRemoved.bind(this);
        this._childChangedListener = this._onChildChanged.bind(this);
    }

    _onChildAdded(state) {
        var url = this._path + '/' + state.key();
        var obj = new (this._childConstructor)(this._device.engine, state.val(), url, this._device);
        this.addOne(obj);
    }

    _onChildRemoved(state) {
        var uniqueId = 'com.nest-' + state.val().device_id;
        this.removeById(uniqueId);
    }

    _onChildChanged(state) {
        var uniqueId = 'com.nest-' + state.val().device_id;
        var device = this.getById(uniqueId);
        if (device !== undefined)
            device.updateState(state.val());
    }

    start() {
        this._firebase = this._device.refFirebaseClient().child(this._path);
        this._firebase.on('child_added', this._childAddedListener);
        this._firebase.on('child_removed', this._childRemovedListener);
        this._firebase.on('child_changed', this._childChangedListener);
    }

    stop() {
        this._firebase.off('child_added', this._childAddedListener);
        this._firebase.off('child_removed', this._childRemovedListener);
        this._firebase.off('child_changed', this._childChangedListener);
        this._firebase = null;
        this._device.unrefFirebaseClient();
    }
}

class UnionObjectSet extends ObjectSet.Base {
    constructor(children) {
        super();
        this.setMaxListeners(Infinity);

        this._children = children;

        this._objectAddedListener = (o) => { this.objectAdded(o); };
        this._objectRemovedListener = (o) => { this.objectRemoved(o); };
    }

    values() {
        return Array.prototype.concat.apply([], this._children.map((c) => c.values()));
    }

    start() {
        this._children.forEach((c) => {
            c.on('object-added', this._objectAddedListener);
            c.on('object-removed', this._objectRemovedListener);
            c.start()
        });
    }

    stop() {
        this._children.forEach((c) => {
            c.removeListener('object-added', this._objectAddedListener);
            c.removeListener('object-removed', this._objectRemovedListener);
            c.start()
        });
    }
}

module.exports = {
    UnionObjectSet: UnionObjectSet,
    NestDeviceCollection: NestDeviceCollection
}
