// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016-2020 The Board of Trustees of the Leland Stanford Junior University
//
// Redistribution and use in source and binary forms, with or
// without modification, are permitted provided that the following
// conditions are met:
//
// 1. Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above
//    copyright notice, this list of conditions and the following
//    disclaimer in the documentation and/or other materials
//    provided with the distribution.
// 3. Neither the name of the copyright holder nor the names of its
//    contributors may be used to endorse or promote products derived
//    from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
// INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
// SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
// HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
// STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED
// OF THE POSSIBILITY OF SUCH DAMAGE.
"use strict";

const Tp = require('thingpedia');
const Url = require('url');

const Utils = require('./utils');

const CONSUMER_KEY = process.env['TWITTER_CONSUMER_KEY'] || 'NpzxRYZSDi98td4Tso8cyePnG';
// Twitter uses OAuth 1.0, so this needs to be here...
const CONSUMER_SECRET = process.env['TWITTER_CONSUMER_SECRET'] || Utils.rot13('YIXSkjDyxWKIs3RY1OVhrEgW8c36PboejyMjrI62pDZzKh81Vz');

function runOAuthStep1(engine) {
    let twitter = Utils.makeTwitterApi(engine, CONSUMER_KEY, CONSUMER_SECRET);

    return new Promise((callback, errback) => {
        twitter.oauth.getOAuthRequestToken((error, oauth_token, oauth_token_secret, query) => {
            if (error)
                errback(error);
            else
                callback({ token: oauth_token, tokenSecret: oauth_token_secret, query: query });
        });
    }).then((result) => {
        const url = Url.parse('https://api.twitter.com/oauth/authorize');
        url.query = result.query;
        url.query['oauth_token'] = result.token;
        url.query['oauth_token_secret'] = result.tokenSecret;
        return [Url.format(url), { 'twitter-token': result.token,
                                   'twitter-token-secret': result.tokenSecret }];
    });
}

function runOAuthStep2(engine, req) {
    let twitter = Utils.makeTwitterApi(engine, CONSUMER_KEY, CONSUMER_SECRET);

    return new Promise((callback, errback) => {
        const token = req.session['twitter-token'];
        const tokenSecret = req.session['twitter-token-secret'];
        const verifier = req.query['oauth_verifier'];

        twitter.oauth.getOAuthAccessToken(token, tokenSecret, verifier, (error, oauth_access_token, oauth_access_token_secret, results) => {
            if (error)
                errback(error);
            else
                callback({ accessToken: oauth_access_token, accessTokenSecret: oauth_access_token_secret });
        });
    }).then((result) => {
        twitter = Utils.makeTwitterApi(engine, CONSUMER_KEY, CONSUMER_SECRET, result.accessToken, result.accessTokenSecret);
        return new Promise((callback, errback) => {
            twitter.getCustomApiCall('/account/verify_credentials.json', {}, errback, callback);
        });
    }).then((result) => {
        result = JSON.parse(result);
        return engine.devices.loadOneDevice({ kind: 'com.twitter',
                                              accessToken: twitter.accessToken,
                                              accessTokenSecret: twitter.accessTokenSecret,
                                              userId: result['id_str'],
                                              screenName: result['screen_name'] }, true);
    });
}

module.exports = class TwitterAccountDevice extends Tp.BaseDevice {
    static runOAuth2(engine, req) {
        return Promise.resolve().then(() => {
            if (req === null)
                return runOAuthStep1(engine);
            else
                return runOAuthStep2(engine, req);
        }).catch((e) => {
            console.log(e);
            console.log(e.stack);
            throw e;
        });
    }

    constructor(engine, state) {
        super(engine, state);

        // NOTE: for legacy reasons, this is twitter-account-*, not com.twitter-* as one would
        // hope
        // please do not follow this example
        this.uniqueId = 'twitter-account-' + this.userId;
    }

    get screenName() {
        return this.state.screenName;
    }

    get userId() {
        return this.state.userId;
    }

    get accessToken() {
        return this.state.accessToken;
    }

    get accessTokenSecret() {
        return this.state.accessTokenSecret;
    }

    get _twitter() {
        return Utils.makeTwitterApi(this.engine, CONSUMER_KEY, CONSUMER_SECRET, this.accessToken, this.accessTokenSecret);
    }

    queryInterface(iface) {
        switch (iface) {
        case 'twitter':
            return this._twitter;
        default:
            return null;
        }
    }

    get_direct_messages(params, filters) {
        return Utils.pollDirectMessages(this._twitter, undefined, this.state.screenName);
    }

    do_post({ status }) {
        if (status.length > 140)
            status = status.substr(0, 139) + '…';

        return new Promise((callback, errback) => {
            this._twitter.postTweet({ status: status }, errback, callback);
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
    }

    do_send_direct_message({ to, message }) {
        return new Promise((callback, errback) => {
            Utils.pollUserId(this._twitter, String(to)).then((user_id) => {
                if (!user_id)
                    throw new Error('User not found');
                const data = {
                    event: {
                        type: 'message_create',
                        message_create: {
                            target: { recipient_id: user_id },
                            message_data: { text: String(message) }
                        }
                    }
                };
                this._twitter.oauth.post(this._twitter.baseUrl + '/direct_messages/events/new.json',
                    this._twitter.accessToken,
                    this._twitter.accessTokenSecret,
                    JSON.stringify(data),
                    "application/json",
                    (err, body, response) => {
                        if (!err && response.statusCode === 200)
                            callback(body);
                        else
                            errback(err, response, body);
                    });
            });
        }).catch((e) => {
            if (e.message && (!e.data && !e.errors))
                throw e;

            console.error('Failed to send direct message', e);
            if (e.data && e.data)
                throw new Error(JSON.parse(e.data).errors[0].message);
            else if (e.errors)
                throw new Error(e.errors[0].message);
            else
                throw new Error(String(e));
        });
    }
};
