// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Yingran Xu <yingran@stanford.edu>
//                Yaqi Zhang <yaqiz@stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

const SendBase = require('./send_base');
const Send = SendBase(function(platform, event) {
    return {
        subject: event[0],
        text: event[1],
        to: event[2]
    }
});

function getAttachment(platform, url) {
    var filename = url.substring(url.lastIndexOf('/')+1);

    // if we're running on an old thingpedia, assume all urls are http
    if (!Tp.Helpers.Content)
        return Promise.resolve({ path: url, filename: filename });

    // if the url is accessible, let nodemailer deal with it
    if (Tp.Helpers.Content.isPubliclyAccessible(url))
        return Promise.resolve({ path: url, filename: filename });

    return Tp.Helpers.Content.getStream(platform, url).then(function(stream) {
        return ({ content: stream, filename: filename });
    });
}

const SendAttach = SendBase(function(platform, event) {
    return getAttachment(platform, event[3]).then(function(attachment) {
        return {
            subject: event[0],
            text: event[1],
            to: event[2],
		    attachments : [attachment]
        };
    });
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
