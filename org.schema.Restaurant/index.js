// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of org.schema
//
// Copyright 2019 The Board of Trustees of the Leland Stanford Junior University
//
// Author: Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

const META = require('./meta.json');
const DATA = require('./data.json');

function parseTime(value) {
    const [, hour, minute, second] = /^([0-9]{2}):([0-9]{2})(?::([0-9]{2}))?$/.exec(value);
    return new Tp.Value.Time(parseInt(hour), parseInt(minute), parseInt(second)||0);
}

module.exports = class extends Tp.BaseDevice {
    _handleField(value, typemeta) {
        if (value === null || value === undefined)
            return null;

        if (typemeta.isArray)
            return value.map((value) => this._handleField(value, { isArray: false, type: typemeta.type }));

        if (typeof typemeta.type === 'string') {
            // entity or builtin object
            if (typemeta.type.startsWith('tt:')) {
                // XXX: we keep String for builtin entities (pictures, phone numbers, etc.)
                // because it's more compatible with other code
                // (it should handle both, but who knows...)
                //if (typemeta.type === 'tt:Entity')
                //    return new Tp.Value.Entity(value, null);
                if (typemeta.type === 'tt:Date')
                    return new Date(value);
                if (typemeta.type === 'tt:Time')
                    return parseTime(value);
                // value is already normalized
                return value;
            } else {
                const entity = DATA[typemeta.type][value];
                if (!entity)
                    return new Tp.Value.Entity(value, null);
                return new Tp.Value.Entity(value, entity.name || null);
            }
        }

        const ret = {};
        for (let field in typemeta.type)
            ret[field] = this._handleField(value[field], typemeta.type[field]);
        return ret;
    }

    _handleObject(into, data, type) {
        const typemeta = META[type];

        for (let base of typemeta.extends)
            this._handleObject(into, data, base);

        for (let field in typemeta.fields) {
            const expectedType = typemeta.fields[field];
            into[field] = this._handleField(data[field], expectedType);
        }
    }
};

for (let type in META) {
    module.exports.prototype['get_' + type] = async function(params, filter) {
        let ret = [];
        const data = DATA[type] || {};
        for (let objId in data) {
            const mapped = {};
            this._handleObject(mapped, data[objId], type);
            mapped.id = new Tp.Value.Entity(objId, data[objId].name || null);
            ret.push(mapped);
        }
        return ret;
    };
}
