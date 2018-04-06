// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
// Copyright 2015 Benjamin Schwartz <bschwart@stanford.edu>, Senthil Nathan <svnathan@stanford.edu>
//
// See LICENSE for details
"use strict";

const events = require('events');

const OAuthUtils = require('./oauth_utils');

module.exports = class TwitterStream extends events.EventEmitter {
    constructor(twitter) {
        super();
        this._twitter = twitter;

        this._connection = null;
        this._dataBuffer = '';
        this._bytesRead = 0;

        this._refCount = 0;
    }

    _processTweet(tweet) {
        const hashtags = tweet.entities.hashtags.map((h) => h.text.toLowerCase());
        const urls = tweet.entities.urls.map((u) => u.expanded_url);

        return {
            text: tweet.text,
            author: tweet.user.screen_name.toLowerCase(),
            hashtags, urls,
            in_reply_to: tweet.in_reply_to_screen_name ? tweet.in_reply_to_screen_name.toLowerCase() : null,
            tweet_id: tweet.id_str,
        };
    }

    _processOneItem(payload) {
        if (payload.delete) {
            this.emit('delete-tweet', payload.delete);
        } else if (payload.scrub_geo || payload.limit || payload.friends ||
                 payload.status_withheld || payload.user_withheld) {
             // ignored
        } else if (payload.disconnect) {
             this.close();
        } else if (payload.warning) {
             console.error('Received warning on Twitter Stream: ' + payload.warning.message);
        } else if (payload.event === 'user_update') {
            // FIXME update the device with new info
        } else if (payload.event) {
            // ignored
        } else if (payload.direct_message) {
            this.emit('dm', {
                sender: payload.sender_screen_name,
                message: payload.text,
                tweet_id: payload.id_str
            });
        } else {
            // tweet!
            this.emit('tweet', this._processTweet(payload));
        }
    }

    _maybeParseOneItem() {
        if (/^(\r\n)+$/.test(this._dataBuffer)) {
            this._dataBuffer = '';
            this._bytesRead = 0;
            return;
        }

        var match = /^(?:\r?\n)*(\d+)\r?\n/.exec(this._dataBuffer);
        if (match === null)
            return;

        // we rely on the fact that we're only matching ASCII chars
        var headerBytes = match[0].length;
        var payloadBytes = this._bytesRead - headerBytes;

        var toRead = parseInt(match[1]);
        if (payloadBytes < toRead)
            return;

        var buffer = this._dataBuffer.substr(headerBytes, toRead);
        this._dataBuffer = this._dataBuffer.substr(headerBytes + toRead);
        this._bytesRead -= headerBytes + toRead;

        try {
            var payload = JSON.parse(buffer);
            this._processOneItem(payload);
        } catch(e) {
            console.log('Failed to parse Twitter streaming chunk: ' + e.message);
            console.log('Full payload was ' + buffer);
        }

        if (this._bytesRead > 0)
            this._maybeParseOneItem(); // tail call
    }

    ref() {
        this._refCount++;

        if (!this._connection)
            this._doOpen();
    }
    unref() {
        this._refCount--;

        if (this._refCount === 0)
            this.close();
    }

    _doOpen() {
        if (this._connection)
            return;

        this._connection = new Promise((callback, errback) => {
            OAuthUtils.performSecureStreamRequest.call(this._twitter.oauth,
                                                       this._twitter.accessToken,
                                                       this._twitter.accessTokenSecret,
                                                       'GET', 'https://userstream.twitter.com/1.1/user.json?delimited=length',
                                                       null, '', null, (error, data, response) => {
                                                           if (error)
                                                               errback(error);
                                                           else
                                                               callback(response);
                                                       });
        }).then((response) => {
            response.on('data', (data) => {
                this._bytesRead += data.length;
                this._dataBuffer += data.toString('utf8');
                this._maybeParseOneItem();
            });
            response.on('end', () => {
                this._connection = null;
            });
            response.on('error', (e) => {
                this.emit('error', e);
            });

            return response.socket;
        }).catch((e) => {
            this.emit('error', e);
            return null;
        });
    }

    close() {
        if (!this._connection)
            return;

        let connection = this._connection;
        this._connection = null;
        connection.then((sock) => {
            if (sock !== null)
                sock.end();
        });
    }
};
