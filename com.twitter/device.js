// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');
const Q = require('q');
const Url = require('url');

const Twitter = require('twitter-node-client').Twitter;
const TwitterStream = require('./stream');

// encryption ;)
function rot13(x) {
    return Array.prototype.map.call(x, function(ch) {
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
    var twitter = makeTwitterApi(engine);

    return Q.Promise(function(callback, errback) {
        return twitter.oauth.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, query) {
            if (error)
                errback(error);
            else
                callback({ token: oauth_token, tokenSecret: oauth_token_secret, query: query });
        });
    }).then(function(result) {
        var url = Url.parse('https://api.twitter.com/oauth/authorize');
        url.query = result.query;
        url.query['oauth_token'] = result.token;
        url.query['oauth_token_secret'] = result.tokenSecret;
        return [Url.format(url), { 'twitter-token': result.token,
                                   'twitter-token-secret': result.tokenSecret }];
    });
}

function runOAuthStep2(engine, req) {
    var twitter = makeTwitterApi(engine);

    return Q.Promise(function(callback, errback) {
        var token = req.session['twitter-token'];
        var tokenSecret = req.session['twitter-token-secret'];
        var verifier = req.query['oauth_verifier'];

        return twitter.oauth.getOAuthAccessToken(token, tokenSecret, verifier, function(error, oauth_access_token, oauth_access_token_secret, results) {
            if (error)
                errback(error);
            else
                callback({ accessToken: oauth_access_token, accessTokenSecret: oauth_access_token_secret });
        });
    }).then(function(result) {
        twitter = makeTwitterApi(engine, result.accessToken, result.accessTokenSecret);
        return Q.Promise(function(callback, errback) {
            return twitter.getCustomApiCall('/account/verify_credentials.json', {}, errback, callback);
        });
    }).then(function(result) {
        result = JSON.parse(result);
        return engine.devices.loadOneDevice({ kind: 'com.twitter',
                                              accessToken: twitter.accessToken,
                                              accessTokenSecret: twitter.accessTokenSecret,
                                              userId: result['id_str'],
                                              screenName: result['screen_name'] }, true);
    });
}

module.exports = class TwitterAccountDevice extends Tp.BaseDevice {
    static runOAuth2() {
        return Q.try(function() {
            if (req === null) {
                return runOAuthStep1(engine);
            } else {
                return runOAuthStep2(engine, req);
            }
        }).catch(function(e) {
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

    queryInterface(iface) {
        switch (iface) {
        case 'twitter':
            return makeTwitterApi(this.engine, this.accessToken, this.accessTokenSecret);
        case 'twitter-stream':
            if (this._stream === null)
                this._stream = new TwitterStream(makeTwitterApi(this.engine, this.accessToken, this.accessTokenSecret));
            return this._stream;
        default:
            return null;
        }
    }

    get_home_timeline(params, count, filters) {
        return Tp.Helpers.Http.get('/...').then((result) => {
            // ...
            return [];
        });
    }

    subscribe_home_timeline(params, state, filters) {
        let last_seen_tweet = state.get('tweet_id');

        let ret = new stream.Readable({ objectMode: true });

        let twitterStream = new TwitterStream(makeTwitterApi(this.engine, this.accessToken, this.accessTokenSecret));
        twitterStream.on('tweet', (tw) => {
            // do magic
            state.set('tweet_id', tw.tweet_id);
            ret.push(tw);
        });
        ret.filters = null;
        ret.destroy = () => twitterStream.close();

        return ret;
    }

    history_home_timeline(params, base, delta, filters) {
        return null;
    }

    sequence_home_timeline(params, base, limit, filters) {
        let from = base-1;
        let to = base+limit-1;
        if (to >= 200)
            return null;

        return Tp.Helpers.Http.get('/...').then((result) => {
            // ...
            return [].slice(from, to);
        });
    }
}

