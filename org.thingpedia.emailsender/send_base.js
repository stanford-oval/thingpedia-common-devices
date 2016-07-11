// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Yingran Xu <yingran@stanford.edu>
//                Yaqi Zhang <yaqiz@stanford.edu>
//
// See COPYING for details

const Tp = require('thingpedia');
const nodemailer = require('nodemailer');

function rot13(x) {
    return Array.prototype.map.call(x, function(ch) {
        var code = ch.charCodeAt(0);
        if (code >= 0x41 && code <= 0x5a)
            code = (((code - 0x41) + 13) % 26) + 0x41;
        else if (code >= 0x61 && code <= 0x7a)
            code = (((code - 0x61) + 13) % 26) + 0x61;

        return String.fromCharCode(code);
    }).join('');
}

module.exports = function(makeMail) {
    return new Tp.ChannelClass({
        Name: 'SendEmailWithAttachmentChannel',

        sendEvent: function(event) {
            // Create mailing service
            var transporter = nodemailer.createTransport({
                service: 'Mailgun',
                auth: {
                    user: 'postmaster@sandbox6e63e5318025445bae814f73a4361aea.mailgun.org',
                    pass: rot13('57rp5q164652o265607ps32153pr8872'),
                }
            });

            // Get input parameters and send the email
            var mail = makeMail(event);
            mail.from = '"Sabrina App" <sabrina@thingengine.stanford.edu>';
            transporter.sendMail(mail, function(error) {
                if (error) {
                    console.error('Failed to send email: ' + error.message);
                    console.error(error.stack);
                } else {
                        console.log('Message sent successfully!');
                }

                transporter.close(); // close the connection pool
            });
        }
    });
}
