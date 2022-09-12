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
const mailcomposer = require('mailcomposer');
const Url = require('url');
const { simpleParser } = require('mailparser');

module.exports = class GMailAccount extends Tp.BaseDevice {
    static get runOAuth2() {
        return Tp.Helpers.OAuth2({
            scope: ['openid', 'profile', 'email',
                'https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/gmail.send'
            ],
            authorize: 'https://accounts.google.com/o/oauth2/auth',
            get_access_token: 'https://www.googleapis.com/oauth2/v3/token',
            set_access_type: true,
            callback(engine, accessToken, refreshToken) {
                const auth = 'Bearer ' + accessToken;
                return Tp.Helpers.Http.get('https://www.googleapis.com/oauth2/v2/userinfo', {auth: auth, accept: 'application/json'}).then((response) => {
                    const parsed = JSON.parse(response);
                    return engine.devices.loadOneDevice({
                        kind: 'com.gmail',
                        accessToken: accessToken,
                        refreshToken: refreshToken,
                        userId: parsed.id,
                        userName: parsed.name
                    }, true);
                });
            }
        });
    }

    constructor(engine, state) {
        super(engine, state);

        this.uniqueId = 'com.gmail.' + this.userId;
        this.name = "Gmail Account %s".format(this.userName);
        this.description = "This is your Gmail. You can use it to send emails.";

        this._labelCache = new Map;
    }

    _resolveLabels(ids) {
        var resolved = new Map;

        var toResolve = false;
        for (var id of ids) {
            if (this._labelCache.has(id))
                resolved.set(id, this._labelCache.get(id));
            else
                toResolve = true;
        }

        if (toResolve) {
            return Tp.Helpers.Http.get('https://www.googleapis.com/gmail/v1/users/me/labels', { useOAuth2: this }).then((data) => {
                var parsed = JSON.parse(data);
                parsed.labels.forEach((label) => {
                    this._labelCache.set(id, label.name.toLowerCase());
                    resolved.set(id, label.name.toLowerCase());
                });
                return resolved;
            });
        } else {
            return resolved;
        }
    }

    get userId() {
        return this.state.userId;
    }

    get userName() {
        return this.state.userName;
    }

    do_send_email({ to, subject, message }) {
        // make a dummy API call just to refresh the access token
        return Tp.Helpers.Http.get('https://www.googleapis.com/oauth2/v2/userinfo', { useOAuth2: this, accept: 'application/json'})
            .then(() => {
            const stream = mailcomposer({ to: String(to), subject, text: message }).createReadStream();
            return Tp.Helpers.Http.postStream('https://www.googleapis.com/upload/gmail/v1/users/me/messages/send', stream, {
                useOAuth2: this,
                dataContentType: 'message/rfc822'
            });
        });
    }
}