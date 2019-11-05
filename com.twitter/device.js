// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');
const Url = require('url');

const Twitter = require('twitter-node-client').Twitter;
const FormData = require('form-data');

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
        return makeTwitterApi(this.engine, this.accessToken, this.accessTokenSecret);
    }

    queryInterface(iface) {
        switch (iface) {
        case 'twitter':
            return this._twitter;
        default:
            return null;
        }
    }

    _pollUserScreenName(user_id) {
        return new Promise((callback, errback) => {
            this._twitter.getUser({ user_id }, errback, callback);
        }).then((response) => {
            return JSON.parse(response).screen_name;
        }).catch((e) => {
            console.log(e);
        });
    }

    _pollUserId(screen_name) {
        return new Promise((callback, errback) => {
            this._twitter.getUser({ screen_name }, errback, callback);
        }).then((response) => {
            return JSON.parse(response).id;
        }).catch((e) => {
            console.log(e);
        });
    }

    _pollHomeTimeline(since_id) {
        return new Promise((callback, errback) => {
            if (since_id !== undefined)
                this._twitter.getHomeTimeline({ since_id, count: 20, include_entities: 'true' }, errback, callback);
            else
                this._twitter.getHomeTimeline({ count: 20, include_entities: 'true' }, errback, callback);
        }).then((results) => JSON.parse(results).map((tweet) => {
            const hashtags = tweet.entities.hashtags.map((h) => h.text.toLowerCase());
            const urls = tweet.entities.urls.map((u) => u.expanded_url);

            return {
                text: tweet.text,
                author: tweet.user.screen_name.toLowerCase(),
                hashtags, urls,
                in_reply_to: tweet.in_reply_to_screen_name ? tweet.in_reply_to_screen_name.toLowerCase() : null,
                tweet_id: tweet.id_str,
            };
        }));
    }
    _pollDirectMessages(since_id) {
        return new Promise((callback, errback) => {
            if (since_id !== undefined)
                this._twitter.getCustomApiCall('/direct_messages/events/list.json', { since_id: since_id, count: 20 }, errback, callback);
            else
                this._twitter.getCustomApiCall('/direct_messages/events/list.json', { count: 20 }, errback, callback);
        }).then((results) => Promise.all(JSON.parse(results).events.map((dm) => {
            console.log(JSON.stringify(dm));
            return this._pollUserScreenName(dm.message_create.sender_id).then((screen_name) => {
                return {
                    sender: screen_name,
                    message: dm.message_create.message_data.text
                };
            });
        }))).then((results) => results.filter((dm) => dm.sender.toLowerCase() !== this.screenName.toLowerCase()));
    }

    get_home_timeline(params, filters) {
        return this._pollHomeTimeline(undefined).then((results) => results.filter((tweet) => tweet.author !== this.screenName.toLowerCase()));
    }
    get_my_tweets(params, filters) {
        return this._pollHomeTimeline(undefined).then((results) => results.filter((tweet) => tweet.author === this.screenName.toLowerCase()));
    }

    get_direct_messages(params, filters) {
        return this._pollDirectMessages(undefined);
    }

    _doSearch(query, count) {
        // twitter default is 15, which is a lot
        // let's default to 5 instead
        count = count || 5;

        return new Promise((callback, errback) => {
            if (query)
                this._twitter.getSearch({ q: query, count: count, include_entities: 'true' }, errback, callback);
            else
                this._twitter.getHomeTimeline({ count: count, include_entities: 'true' }, errback, callback);
        }).then((response) => {
            let tweets = JSON.parse(response);
            if (tweets.statuses)
                tweets = tweets.statuses;
            return tweets.map((tweet) => {
                const hashtags = tweet.entities.hashtags.map((h) => h.text.toLowerCase());
                const urls = tweet.entities.urls.map((u) => u.expanded_url);

                return {
                    query, count,
                    text: tweet.text,
                    author: tweet.user.screen_name.toLowerCase(),
                    hashtags, urls,
                    in_reply_to: tweet.in_reply_to_screen_name ? tweet.in_reply_to_screen_name.toLowerCase() : null,
                    tweet_id: tweet.id_str,
                 };
            });
        });
    }

    get_search(params, filters, count) {
        let query = '';
        /*if (false) {
            // FIXME filter on username or in_reply_to
            let from = filters[5];
            if (from !== undefined && from !== null)
                query += ' from:' + from;
            let inReplyTo = filters[6];
            if (inReplyTo !== undefined && inReplyTo !== null)
                query += ' to:' + inReplyTo;
        }*/
        query = query.trim();

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
            const url = 'https://upload.twitter.com/1.1/media/upload.json';

            const formData = new FormData();
            formData.append('media', stream, {
                contentType: stream.contentType
            });

            let buffers = [];
            let len = 0;
            formData.on('data', (buf) => {
                if (typeof buf === 'string')
                    buf = new Buffer(buf);
                buffers.push(buf);
                len += buf.length;
            });
            formData.on('error', errback);
            formData.on('end', () => {
                let body = Buffer.concat(buffers, len);
                let dataContentType = 'multipart/form-data; boundary=' + formData.getBoundary();
                this._twitter.oauth.post(url,
                                         this.accessToken,
                                         this.accessTokenSecret,
                                         body,
                                         dataContentType,
                                         (err, body, response) => {
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
            });
            formData.resume();
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
            this._pollUserId(String(to)).then((user_id) => {
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

