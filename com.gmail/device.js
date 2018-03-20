// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Silei Xu <silei@stanford.edu>
//           2018 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');
const mailcomposer = require('mailcomposer');
const Url = require('url');
const { simpleParser } = require('mailparser');

module.exports = class GMailAccount extends Tp.BaseDevice {
    static get runOAuth2() {
        return Tp.Helpers.OAuth2({
            scope: ['openid', 'profile', 'email', 'https://mail.google.com/'],
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
        this.description = "This is your Gmail Account. You can use it access and manage your emails.";

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

    _getMessage(emailId) {
        return Tp.Helpers.Http.get('https://www.googleapis.com/gmail/v1/users/me/messages/' + encodeURIComponent(String(emailId)) + '?format=raw', { useOAuth2: this }).then((response) => {
            const parsed = JSON.parse(response);

            return Promise.all([parsed, simpleParser(new Buffer(parsed.raw, 'base64'))]);
        });
    }

    get_inbox({ is_important, is_primary }) {
        // TODO filters

        let query = 'in:inbox';
        if (is_important)
            query += ' is:important';
        if (is_primary)
            query += ' category:primary';

        return Tp.Helpers.Http.get('https://www.googleapis.com/gmail/v1/users/me/messages?maxResults=5&q=' + encodeURIComponent(query), { useOAuth2: this })
        .then((response) => {
            const parsed = JSON.parse(response);
            return Promise.all(parsed.messages.map((m) => {
                return this._getMessage(m.id).then(([m, parsedMessage]) => {
                    const sender_name = parsedMessage.from.value[0].name;
                    const sender_address = parsedMessage.from.value[0].address;
                    const date = parsedMessage.date;
                    const subject = parsedMessage.subject;

                    const snippet = m.snippet.replace(/&#([0-9]+);/g, (str, code) => String.fromCharCode(parseInt(code, 10)));

                    return this._resolveLabels(m.labelIds).then((resolved) => {
                        const labels = m.labelIds.map((id) => resolved.get(id)).filter((label) => !!label);
                        return {
                            sender_name,
                            sender_address,
                            subject, date, labels,
                            snippet,
                            thread_id: m.threadId,
                            email_id: m.id
                        };
                    });
                });
            }));
        });
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

    _getAttachment(url) {
        const platform = this.engine.platform;

        const parsed = Url.parse(url);
        const filename = parsed.pathname.substring(parsed.pathname.lastIndexOf('/')+1);

        // if the url is accessible, let mailcomposer deal with it
        if (Tp.Helpers.Content.isPubliclyAccessible(url))
            return Promise.resolve({ path: url, filename: filename });

        return Tp.Helpers.Content.getStream(platform, url).then((stream) => {
            return ({ content: stream, filename: filename, contentType: stream.contentType });
        });
    }

    do_send_picture({ to, subject, message, picture_url }) {
        // make a dummy request to refresh the OAuth token, as we won't be able to
        // do so with the stream
        return Tp.Helpers.Http.get('https://www.googleapis.com/oauth2/v2/userinfo', { useOAuth2: this, accept: 'application/json' })
            .then(() => {
            return this._getAttachment(String(picture_url));
        }).then((attachment) => {
            var stream = mailcomposer({
                to: String(to),
                subject,
                text: message,
                attachments: [attachment],
            }).createReadStream();

            return Tp.Helpers.Http.postStream('https://www.googleapis.com/upload/gmail/v1/users/me/messages/send', stream, {
                useOAuth2: this,
                dataContentType: 'message/rfc822'
            });
        });
    }

    do_reply({ email_id, subject, message }) {
        return this._getMessage(email_id).then(([m, parsedMessage]) => {
            const text = parsedMessage.text.split(/\r?\n/).map((l) => '> ' + l).join('\n');
            const reply = `${message}\n\nOn ${parsedMessage.date.toLocaleString()}, ${parsedMessage.from.text} wrote:\n${text}`;

            const newSubject = subject ? `${subject} [Re: ${parsedMessage.subject}]` : `Re: ${parsedMessage.subject}`;

            const stream = mailcomposer({ to: parsedMessage.from.text, inReplyTo: parsedMessage.messageId, subject: newSubject, text: reply }).createReadStream();
            return Tp.Helpers.Http.postStream('https://www.googleapis.com/upload/gmail/v1/users/me/messages/send', stream, {
                useOAuth2: this,
                dataContentType: 'message/rfc822'
            });
        });
    }

    do_forward({ email_id, to, message }) {
        return this._getMessage(email_id).then(([m, parsedMessage]) => {
            const newSubject = `Fwd: ${parsedMessage.subject}`;

            const stream = mailcomposer({
                to: String(to),
                subject: newSubject,
                text: message,
                references: [parsedMessage.messageId],
                attachments: [{
                    contentType: 'message/rfc822',
                    contentDisposition: 'inline',
                    encoding: 'base64',
                    content: m.raw
                }]
            }).createReadStream();

            return Tp.Helpers.Http.postStream('https://www.googleapis.com/upload/gmail/v1/users/me/messages/send', stream, {
                useOAuth2: this,
                dataContentType: 'message/rfc822'
            });
        });
    }
};
