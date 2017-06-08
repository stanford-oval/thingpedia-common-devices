// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Silei Xu <silei@stanford.edu>
//
// See LICENSE for details

const Url = require('url');
const Tp = require('thingpedia');
const mailcomposer = require('mailcomposer');

URL_BASE = "https://www.googleapis.com/upload/gmail/v1/users/me/messages/send";

module.exports = new Tp.ChannelClass({
    Name: 'SendGMailPicture',

    _init: function(engine, device) {
        this.parent(engine, device);
        this.url = URL_BASE;
    },

    getAttachment(url) {
        var platform = this.engine.platform;

        var parsed = Url.parse(url);
        var filename = parsed.pathname.substring(parsed.pathname.lastIndexOf('/')+1);

        // if the url is accessible, let mailcomposer deal with it
        if (Tp.Helpers.Content.isPubliclyAccessible(url))
            return Promise.resolve({ path: url, filename: filename });

        return Tp.Helpers.Content.getStream(platform, url).then(function(stream) {
            return ({ content: stream, filename: filename, contentType: stream.contentType });
        });
    },

    sendEvent(event) {
        // make a dummy request to refresh the OAuth token, as we won't be able to
        // do so with the stream
        return Tp.Helpers.Http.get('https://www.googleapis.com/oauth2/v2/userinfo', { useOAuth2: this.device, accept: 'application/json'})
            .then(() => {
            return this.getAttachment(event[3]);
        }).then((attachment) => {
            var stream = mailcomposer({
                to: event[0],
                subject: event[1],
                text: event[2],
                attachments: [attachment],
            }).createReadStream();

            return Tp.Helpers.Http.postStream(this.url, stream, {
                useOAuth2: this.device,
                dataContentType: 'message/rfc822'
            });
        });
    }
});
