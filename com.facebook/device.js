// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

module.exports = class FacebokDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);

        this.uniqueId = 'com.facebook-' + this.profileId;
        this.name = "Facebook Account %s".format(this.userName);
        this.description = "This is your Facebook Account. You can use it to access your wall, follow your friends and more.";
    }
    
    get userName() {
        return this.state.userName || this.state.profileId;
    }

    get profileId() {
        return this.state.profileId;
    }

    do_post({ status }) {
        return Tp.Helpers.Http.post('https://graph.facebook.com/v2.12/me/feed', 'message=' + encodeURIComponent(status),
            { useOAuth2: this, dataContentType: 'application/x-www-form-urlencoded' });
    }

    do_post_picture({ caption, picture_url }) {
        const fbURL = 'https://graph.facebook.com/v2.12/me/photos';

        console.log(picture_url);
        if (Tp.Helpers.Content.isPubliclyAccessible(picture_url)) {
            console.log('publicly accessible');
            return Tp.Helpers.Http.post(fbURL, 'url=%s&caption=%s'.format(encodeURIComponent(picture_url), encodeURIComponent(caption)),
                { useOAuth2: this, dataContentType: 'application/x-www-form-urlencoded' });
        } else {
            return Tp.Helpers.Content.getStream(this.engine.platform, picture_url).then((stream) => {
                return new Promise((callback, errback) => {
                    const buffers = [];
                    let length = 0;

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
                console.log('contentType', contentType);
                console.log('buffer', buffer.length);
                const boundary = 'formboundary';
                const before = new Buffer('--' + boundary + '\r\n' +
                    'Content-Disposition: form-data; name="caption"\r\n' +
                    'Content-Type: text/plain; charset="UTF-8"\r\n' +
                    '\r\n' +
                    caption + '\r\n' +
                    '--' + boundary + '\r\n' +
                    'Content-Type: ' + contentType + '\r\n' +
                    'Content-Transfer-Encoding: binary\r\n' +
                    'Content-Disposition: form-data; name="source"\r\n' +
                    '\r\n', 'utf8');
                console.log('Before:', before.toString().replace(/\r\n/g, '\\r\\n'));
                const after = new Buffer('\r\n--' + boundary + '--\r\n', 'utf8');
                console.log('After:', after.toString().replace(/\r\n/g, '\\r\\n'));
                const body = Buffer.concat([before, buffer, after], before.length + buffer.length + after.length);
                console.log('Body', body);

                return Tp.Helpers.Http.post(fbURL, body,
                    { useOAuth2: this, dataContentType: 'multipart/form-data; boundary=' + boundary });
            });
        }
    }
};
module.exports.runOAuth2 = Tp.Helpers.OAuth2({
    kind: 'com.facebook',
    scope: ['email', 'public_profile', 'user_friends', 'publish_actions'],
    authorize: 'https://www.facebook.com/v2.7/dialog/oauth',
    get_access_token: 'https://graph.facebook.com/oauth/access_token',

    // we need to force thingengine.stanford.edu as redirect uri
    // because we're half-lying to facebook and claiming we're a website instead
    // of a mobile app
    redirect_uri: 'https://thingengine.stanford.edu/devices/oauth2/callback/com.facebook',
    callback(engine, accessToken, refreshToken) {
        return Tp.Helpers.Http.get('https://graph.facebook.com/me',
                                   { auth: "Bearer " + accessToken, accept: 'application/json' }).then((response) => {
            const parsed = JSON.parse(response);
            return engine.devices.loadOneDevice({ kind: 'com.facebook',
                                                  accessToken: accessToken,
                                                  refreshToken: refreshToken,
                                                  userName: parsed.name,
                                                  profileId: parsed.id }, true);
        });
    }
});
