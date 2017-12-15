// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');
const Url = require('url');
const stream = require('stream');

const Twitter = require('twitter-node-client').Twitter;
const TwitterStream = require('./stream');

// encryption ;)
function rot13(x) {
    return Array.prototype.map.call(x, (ch) => {
        var code = ch.charCodeAt(0);
        if (code >= 0x41 && code <= 0x5a)
            code = (((code - 0x41) + 13) % 26) + 0x41;
        else if (code >= 0x61 && code <= 0x7a)
            code = (((code - 0x61) + 13) % 26) + 0x61;

        return String.fromCharCode(code);
    }).join('');
}

const CONSUMER_KEY = process.env['TWITTER_CONSUMER_KEY'] || 'VZRViA2T4qy7CBZjU5juPumZN';
// Twitter uses OAuth 1.0, so this needs to be here...
const CONSUMER_SECRET = process.env['TWITTER_CONSUMER_SECRET'] || rot13('hsTCqM6neIt3hqum6zvnDCIqQkUuyWtSjKBoqZFONvzVXfb7OJ');

function makeTwitterApi(engine, accessToken, accessTokenSecret) {
    var origin = engine.platform.getOrigin();
    return new Twitter({
        consumerKey: CONSUMER_KEY,
        consumerSecret: CONSUMER_SECRET,
        callBackUrl: origin + '/devices/oauth2/callback/com.twitter',
        accessToken: accessToken,
        accessTokenSecret: accessTokenSecret
    });
}

function runOAuthStep1(engine) {
    let twitter = makeTwitterApi(engine);

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
    let twitter = makeTwitterApi(engine);

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
        twitter = makeTwitterApi(engine, result.accessToken, result.accessTokenSecret);
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

// a fixed version of postCustomApiCall that does not append
// the parameters to the url (which would break OAuth)
function postCustomApiCall(url, params, error, success) {
    url = this.baseUrl + url;
    this.doPost(url, params, error, success);
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
        this.name = "Twitter Account %s".format(this.screenName);
        this.description = "This is your Twitter Account. You can use it to be updated on the status of your friends, and update them with your thoughts.";

        this._stream = null;
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

    get _twitterStream() {
        if (this._stream === null)
            this._stream = new TwitterStream(makeTwitterApi(this.engine, this.accessToken, this.accessTokenSecret));
        return this._stream;
    }

    get _twitter() {
        return makeTwitterApi(this.engine, this.accessToken, this.accessTokenSecret);
    }

    queryInterface(iface) {
        switch (iface) {
        case 'twitter':
            return this._twitter;
        case 'twitter-stream':
            return this._stream;
        default:
            return null;
        }
    }

    _pollHomeTimeline(since_id) {
        return new Promise((callback, errback) => {
            if (since_id !== undefined)
                this._twitter.getHomeTimeline({ since_id, count: 200, include_entities: 'true' }, errback, callback);
            else
                this._twitter.getHomeTimeline({ count: 200, include_entities: 'true' }, errback, callback);
        }).then((results) => JSON.parse(results).map((tweet) => {
            const hashtags = tweet.entities.hashtags.map((h) => h.text.toLowerCase());
            const urls = tweet.urls.map((u) => u.expanded_url);

            return {
                text: tweet.text,
                from: tweet.user.screen_name.toLowerCase(),
                hashtags, urls,
                in_reply_to: tweet.in_reply_to_screen_name ? tweet.in_reply_to_screen_name.toLowerCase() : null,
                tweet_id: tweet.id_str,
            };
        }));
    }
    _pollDirectMessages(since_id) {
        return new Promise((callback, errback) => {
            if (since_id !== undefined)
                this._twitter.getCustomApiCall('direct_messages', { since_id: since_id, count: 200 }, errback, callback);
            else
                this._twitter.getCustomApiCall('direct_messages', { count: 200 }, errback, callback);
        }).then((results) => results.map((dm) => {
            return {
                from: dm.sender_screen_name,
                message: dm.text,
                tweet_id: dm.id_str
            };
        }));
    }

    get_home_timeline(params, count, filters) {
        return this._pollHomeTimeline(undefined).then((results) => results.filter((tweet) => tweet.from !== this.screenName));
    }
    get_my_tweets(params, count, filters) {
        return this._pollHomeTimeline(undefined).then((results) => results.filter((tweet) => tweet.from === this.screenName));
    }

    _doSubscribeHomeTimeline(state, filter) {
        const last_seen_tweet = state.get('tweet_id');
        const ret = new stream.Readable({ objectMode: true });

        const userStream = this._twitterStream;
        userStream.ref();
        const listener = (tweet) => {
            if (!filter(tweet.from))
                return;
            state.set('tweet_id', tweet.tweet_id);
            ret.push(tweet);
        };
        const errorListener = (e) => ret.emit('error', e);
        userStream.on('error', errorListener);
        this._pollHomeTimeline(last_seen_tweet).then((results) => {
            for (let tweet of results) {
                if (!filter(tweet))
                    continue;
                ret.push(tweet);
                state.set('tweet_id', tweet.tweet_id);
            }

            userStream.on('tweet', listener);
        });
        ret.filters = null;
        ret.destroy = () => {
            userStream.removeListener('tweet', listener);
            userStream.removeListener('error', errorListener);
            userStream.unref();
        };

        return ret;
    }
    subscribe_home_timeline(params, state, filters) {
        return this._doSubscribeHomeTimeline(state, (tweet) => tweet.from !== this.screenName);
    }
    subscribe_my_tweets(params, state, filters) {
        return this._doSubscribeHomeTimeline(state, (tweet) => tweet.from === this.screenName);
    }

    get_direct_messages(params, count, filters) {
        return this._pollDirectMessages(undefined);
    }
    subscribe_direct_messages(params, state, filter) {
        const last_seen_tweet = state.get('tweet_id');
        const ret = new stream.Readable({ objectMode: true });

        const userStream = this._twitterStream;
        userStream.ref();
        const listener = (dm) => {
            state.set('tweet_id', dm.tweet_id);
            ret.push(dm);
        };
        const errorListener = (e) => ret.emit('error', e);
        userStream.on('error', errorListener);
        this._pollDirectMessages(last_seen_tweet).then((results) => {
            for (let dm of results) {
                ret.push(dm);
                state.set('tweet_id', dm.tweet_id);
            }
            userStream.on('dm', listener);
        });
        ret.filters = null;
        ret.destroy = () => {
            userStream.removeListener('dm', listener);
            userStream.removeListener('error', errorListener);
            userStream.unref();
        };

        return ret;
    }

    _doSearch(query, count) {
        // twitter default is 15, which is a lot
        // let's default to 5 instead
        count = count || 5;

        return new Promise((callback, errback) => {
            this._twitter.getSearch({ q: query, count: count, include_entities: 'true' }, errback, callback);
        }).then((response) => JSON.parse(response).statuses.map((tweet) => {
            const hashtags = tweet.entities.hashtags.map((h) => h.text.toLowerCase());
            const urls = tweet.urls.map((u) => u.expanded_url);

            return {
                query, count,
                text: tweet.text,
                from: tweet.user.screen_name.toLowerCase(),
                hashtags, urls,
                in_reply_to: tweet.in_reply_to_screen_name ? tweet.in_reply_to_screen_name.toLowerCase() : null,
                tweet_id: tweet.id_str,
            };
        }));
    }

    get_search({ query }, count, filters) {
        // FIXME filter on username or in_reply_to
        let from = filters[5];
        if (from !== undefined && from !== null)
            query += ' from:' + from;
        let inReplyTo = filters[6];
        if (inReplyTo !== undefined && inReplyTo !== null)
            query += ' to:' + inReplyTo;
        if (query.trim().length === 0)
            throw new Error('Must specify a search query or a username to search');

        return this._doSearch(query, count);
    }
    get_search_by_hashtag({ query_hashtag }, count, filters) {
        let query = String(query_hashtag);
        if (!query.startsWith('#'))
            query = '#' + String(query_hashtag);

        // FIXME filter on username or in_reply_to
        let from = filters[5];
        if (from !== undefined && from !== null)
            query += ' from:' + from;
        let inReplyTo = filters[6];
        if (inReplyTo !== undefined && inReplyTo !== null)
            query += ' to:' + inReplyTo;

        return this._doSearch(query, count);
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
    do_post_picture({ caption, picture_url }) {
        if (caption.length > 140)
            caption = caption.substr(0, 139) + '…';

        return Tp.Helpers.Content.getStream(this.engine.platform, String(picture_url)).then((stream) => new Promise((callback, errback) => {
            let buffers = [];
            let length = 0;

            stream.on('data', (buffer) => {
                buffers.push(buffer);
                length += buffer.length;
            });
            stream.on('end', () => {
                callback([Buffer.concat(buffers, length), stream.contentType]);
            });
            stream.on('error', errback);
        })).then(([buffer, contentType]) => new Promise((callback, errback) => {
            const url = 'https://upload.twitter.com/1.1/media/upload.json';

            const boundary = 'formboundary';
            const before = new Buffer('--' + boundary + '\r\n' +
                'Content-Type: ' + contentType + '\r\n' +
                'Content-Transfer-Encoding: binary\r\n' +
                'Content-Disposition: form-data; name="media"\r\n' +
                '\r\n', 'utf8');
            //console.log('Before:', before.toString().replace(/\r\n/g, '\\r\\n'));
            const after = new Buffer('\r\n--' + boundary + '--\r\n', 'utf8');
            //console.log('After:', after.toString().replace(/\r\n/g, '\\r\\n'));
            const body = Buffer.concat([before, buffer, after], before.length + buffer.length + after.length);
            //console.log('Body', body);

            this._twitter.oauth.post(url, this.accessToken, this.accessTokenSecret,
                body, 'multipart/form-data; boundary=' + boundary, (err, body, response) => {
                console.log('URL [%s]', url);
                if (!err && response.statusCode === 200) {
                    callback(body);
                } else {
                    console.error('Failed to upload media to Twitter: ', err);
                    if (err)
                        errback(err);
                    else
                        errback(new Error('Unexpected HTTP error ' + response.statusCode));
                }
            });
        })).then((response) => {
            const upload = JSON.parse(response);
            //console.log('upload', upload);
            const mediaId = upload.media_id_string;

            return new Promise((callback, errback) => {
                this._twitter.postTweet({ status: caption, media_ids: [mediaId] }, errback, callback);
            });
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
    do_retweet({ tweet_id }) {
        return new Promise((callback, errback) => {
            postCustomApiCall.call(this._twitter, '/statuses/retweet/' + tweet_id + '.json', {}, errback, callback);
        }).catch((e) => {
            if (e.message && (!e.data && !e.errors))
                throw e;

            console.error('Failed to retweet', e);
            if (e.data && e.data)
                throw new Error(JSON.parse(e.data).errors[0].message);
            else if (e.errors)
                throw new Error(e.errors[0].message);
            else
                throw new Error(String(e));
        });
    }

    do_follow({ user_name }) {
        return new Promise((callback, errback) => {
            this._twitter.postCreateFriendship({ screen_name: String(user_name), follow: 'true' }, errback, callback);
        }).catch((e) => {
            if (e.statusCode && e.data) {
                // OAuth.js style error
                if (e.statusCode === 403) {
                    // duplicate friendship, eat the error
                    return;
                }

                console.error('Unexpected HTTP error', e.data);
                throw new Error('Unexpected HTTP error ' + e.statusCode);
            } else {
                throw e;
            }
        });
    }
    do_unfollow({ user_name }) {
        return new Promise((callback, errback) => {
            postCustomApiCall.call(this._twitter, '/friendships/destroy.json', { screen_name: String(user_name) }, errback, callback);
        }).catch((e) => {
            if (e.statusCode && e.data) {
                // OAuth.js style error
                if (e.statusCode === 403) {
                    // duplicate friendship, eat the error
                    return;
                }

                console.error('Unexpected HTTP error', e.data);
                throw new Error('Unexpected HTTP error ' + e.statusCode);
            } else {
                throw e;
            }
        });
    }

    do_send_direct_message({ to, message }) {
        return new Promise((callback, errback) => {
            this._twitter.sendDirectMessage({ screen_name: String(to), text: message }, errback, callback);
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

