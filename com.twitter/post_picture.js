// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2015 Giovanni Campagna
//

const Tp = require('thingpedia');
const Q = require('q');

module.exports = new Tp.ChannelClass({
    Name: 'TwitterPostPictureChannel',

    _init: function(engine, device) {
        this.parent(engine, device);
        this._twitter = device.queryInterface('twitter');
    },

    sendEvent: function(event) {
        console.log('Posting Twitter event', event);

        var status = event[0];
        if (status.length > 140)
            status = status.substr(0, 139) + '…';
        var url = event[1];

        return Tp.Helpers.Content.getStream(this.engine.platform, url).then((stream) => {
            return Q.Promise(function(callback, errback) {
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
        }).spread((buffer, contentType) => {
            return Q.Promise((callback, errback) => {
                var url = 'https://upload.twitter.com/1.1/media/upload.json';

                var boundary = 'formboundary';
                var before = new Buffer('--' + boundary + '\r\n' +
                    'Content-Type: ' + contentType + '\r\n' +
                    'Content-Transfer-Encoding: binary\r\n' +
                    'Content-Disposition: form-data; name="media"\r\n' +
                    '\r\n', 'utf8');
                //console.log('Before:', before.toString().replace(/\r\n/g, '\\r\\n'));
                var after = new Buffer('\r\n--' + boundary + '--\r\n', 'utf8');
                //console.log('After:', after.toString().replace(/\r\n/g, '\\r\\n'));
                var body = Buffer.concat([before, buffer, after], before.length + buffer.length + after.length);
                //console.log('Body', body);

                this._twitter.oauth.post(url, this._twitter.accessToken, this._twitter.accessTokenSecret,
                    body, 'multipart/form-data; boundary=' + boundary, function (err, body, response) {
                    console.log('URL [%s]', url);
                    if (!err && response.statusCode == 200) {
                        callback(body);
                    } else {
                        console.error('Failed to upload media to Twitter: ', err);
                        if (err)
                            errback(err);
                        else
                            errback(new Error('Unexpected HTTP error ' + response.statusCode));
                    }
                });
            });
        }).then((response) => {
            var upload = JSON.parse(response);
            //console.log('upload', upload);
            var mediaId = upload.media_id_string;

            return Q.Promise((callback, errback) => {
                this._twitter.postTweet({ status: status, media_ids: [mediaId] }, errback, callback);
        }).catch((e) => {
            if (e.message && (!e.data && !e.errors))
                throw e;

            console.error('Failed to post tweet', e);
            if (e.data && e.data)
                throw new Error(JSON.parse(e.data).errors[0].message);
            else if (e.errors)
                throw new Error(e.errors[0].message);
            else
                throw new Error(String(e));
        });
        });
    },
});
