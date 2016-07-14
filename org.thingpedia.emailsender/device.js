// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Yingran Xu <yingran@stanford.edu>
//                Yaqi Zhang <yaqiz@stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

const SendBase = require('./send_base');
const Send = SendBase(function(event) {
    return {
        subject: event[0],
        text: event[1],
        to: event[2]
    }
});
const SendAttach = SendBase(function(event) {
    return {
        subject: event[0],
        text: event[1],
        to: event[2],
		attachments : [{ path: event[3] }]
    }
});

module.exports = new Tp.DeviceClass({
    Name: 'EmailSenderDevice',

    _init: function(engine, state) {
        this.parent(engine, state);
        this.uniqueId = 'org.thingpedia.emailsender';
        this.name = "Email Sender";
        this.description = "Sending email without authentication.";
    },

    getActionClass(id) {
        switch(id) {
        case 'send':
            return Send;

        // same code, but they differ in the schema (the picture one will
        // let the user upload a picture)
        case 'send_attach':
        case 'send_picture':
            return SendAttach;

        default:
            throw new Error('Invalid action ' + id);
        }
    }
});
