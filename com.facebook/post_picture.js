// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingPedia
//
// Copyright 2016 Lingxiao Li <csimstu@stanford.edu>
//                Kaidi Yan <kaidi@stanford.edu>
//
// See LICENSE for details

var Tp = require('thingpedia');

module.exports = new Tp.ChannelClass({
    Name: 'FacebookPostPictureChannel',

    sendEvent(event) {
        var photoURL = event[0];
        var caption = event[1] || '';

        var fbURL = 'https://graph.facebook.com/v2.5/me/photos';

        if (Tp.Helpers.Content.isPubliclyAccessible(photoURL)) {
            return Tp.Helpers.Http.post(fbURL, 'url=%s&caption=%s'.format(encodeURIComponent(photoURL), encodeURIComponent(caption)),
                { useOAuth2: this.device, dataContentType: 'application/x-www-form-urlencoded' });
        } else {
            return Tp.Helpers.Content.getStream(this.engine.platform, url).then((stream) => {
                return new Promise(function(callback, errback) {
                    var buffers = [];
                    var length = 0;

                    stream.on('data', (buffer) => {
                        buffers.push(buffer);
                        length += buffer.length;
                    });
                    stream.on('end', () => {
                        callback([Buffer.concat(buffers, length), stream.contentType]);
                    });
                    stream.on('error', errback);
                });
            }).then(([buffer, contentType]) => {
                var boundary = 'formboundary';
                var before = new Buffer('--' + boundary + '\r\n' +
                    'Content-Disposition: form-data; name="caption"\r\n' +
                    'Content-Type: text/plain; charset="UTF-8"\r\n' +
                    '\r\n' +
                    caption + '\r\n' +
                    '--' + boundary + '\r\n' +
                    'Content-Type: ' + contentType + '\r\n' +
                    'Content-Transfer-Encoding: binary\r\n' +
                    'Content-Disposition: form-data; name="source"\r\n' +
                    '\r\n', 'utf8');
                //console.log('Before:', before.toString().replace(/\r\n/g, '\\r\\n'));
                var after = new Buffer('\r\n--' + boundary + '--\r\n', 'utf8');
                //console.log('After:', after.toString().replace(/\r\n/g, '\\r\\n'));
                var body = Buffer.concat([before, buffer, after], before.length + buffer.length + after.length);
                //console.log('Body', body);

                return Tp.Helpers.Http.post(fbURL, body,
                    { useOAuth2: this.device, dataContentType: 'multipart/form-data; boundary=' + boundary });
            });
        }
    }
});
