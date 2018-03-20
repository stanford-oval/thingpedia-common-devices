// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Jacob Baldwin <jtb5np@stanford.edu>
//                Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Q = require('q');
const Url = require('url');
const Tp = require('thingpedia');
const oauth = require('oauth');

const PostPicture = require('./post_picture');
const PostText = require('./post_text');

function makeOAuthApi(factory, engine) {
    var origin = engine.platform.getOrigin();
    return new oauth.OAuth('https://www.tumblr.com/oauth/request_token',
                           'https://www.tumblr.com/oauth/access_token',
                           factory.metadata.auth.client_id,
                           factory.metadata.auth.client_secret,
                           '1.0a',
                           origin + '/devices/oauth2/callback/com.tumblr',
                           'HMAC-SHA1');
}

function runOAuthStep1(factory, engine) {
    var oauth = makeOAuthApi(factory, engine);

    return Q.Promise(function(callback, errback) {
        return oauth.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, query) {
            if (error)
                errback(error);
            else
                callback({ token: oauth_token, tokenSecret: oauth_token_secret, query: query });
        });
    }).then(function(result) {
        var url = Url.parse('https://www.tumblr.com/oauth/authorize');
        url.query = result.query;
        url.query['oauth_token'] = result.token;
        url.query['oauth_token_secret'] = result.tokenSecret;
        return [Url.format(url), { 'tumblr-token': result.token,
                                   'tumblr-token-secret': result.tokenSecret }];
    });
}

function runOAuthStep2(factory, engine, req) {
    var oauth = makeOAuthApi(factory, engine);

    return Q.Promise(function(callback, errback) {
        var token = req.session['tumblr-token'];
        var tokenSecret = req.session['tumblr-token-secret'];
        var verifier = req.query['oauth_verifier'];

        return oauth.getOAuthAccessToken(token, tokenSecret, verifier, function(error, oauth_access_token, oauth_access_token_secret, results) {
            if (error)
                errback(error);
            else
                callback({ accessToken: oauth_access_token, accessTokenSecret: oauth_access_token_secret });
        });
    }).then(function(tokenResult) {
        return Q.ninvoke(oauth, 'get', 'https://api.tumblr.com/v2/user/info', tokenResult.accessToken, tokenResult.accessTokenSecret).then(function([data, response]) {
            var userResult = JSON.parse(data);

            return ({
                accessToken: tokenResult.accessToken,
                accessTokenSecret: tokenResult.accessTokenSecret,
                username: userResult.response.user.name
            });
        });
    }).then(function(result) {
        return engine.devices.loadOneDevice({ kind: 'com.tumblr',
                                              accessToken: result.accessToken,
                                              accessTokenSecret: result.accessTokenSecret,
                                              username: result.username }, true);
    });
}

const TumblrBlogDevice = new Tp.DeviceClass({
    Name: 'TumblrBlogDevice',

    _init(engine, master, state) {
        this.parent(engine, state);
        this.master = master;

        this.uniqueId = 'com.tumblr.blog-' + state.blogId;

        this.name = "Tumblr Blog %s".format(state.blogId);
        this.description = "This is Tumblr Blog %s you have write access to, through your Tumblr account %s".format(state.title, master.username);
    },

    get kind() {
        return 'com.tumblr';
    },

    get blogId() {
        return this.state.blogId;
    },

    get accessToken() {
        return this.master.accessToken;
    },

    get accessTokenSecret() {
        return this.master.accessTokenSecret;
    },

    queryInterface(iface) {
        switch (iface) {
        case 'tumblr-oauth':
            return this.master.queryInterface(iface);
        default:
            return null;
        }
    },

    getActionClass(id) {
        switch (id) {
        case 'post_picture':
            return PostPicture;
        case 'post_text':
            return PostText;
        default:
            throw new Error('Invalid action name ' + id);
        }
    }
});
TumblrBlogDevice.metadata = {
    types: ['tumblr-blog'],
    child_types: [],
};

module.exports = new Tp.DeviceClass({
    Name: 'TumblrDevice',
    UseOAuth2: function runOAuth2(engine, req) {
        return Q.try(() => {
            if (req === null) {
                return runOAuthStep1(this, engine);
            } else {
                return runOAuthStep2(this, engine, req);
            }
        }).catch(function(e) {
            console.log(e);
            console.log(e.stack);
            throw e;
        });
    },

    _init: function(engine, state) {
        this.parent(engine, state);

        this.uniqueId = 'com.tumblr-' + state.username;

        this.name = "Tumblr Account " + state.username;
        this.description = "Your Tumblr account allows you to retrieve information about Tumblr blogs and post on your blogs.";

        this._deviceCollection = new Tp.ObjectSet.Simple(false);
    },

    get username() {
        return this.state.username;
    },

    get accessToken() {
        return this.state.accessToken;
    },

    get accessTokenSecret() {
        return this.state.accessTokenSecret;
    },

    start() {
        this._ensureOAuth();
        return Q.ninvoke(this._oauth, 'get', 'https://api.tumblr.com/v2/user/info', this.accessToken, this.accessTokenSecret).then(([data, response]) => {
            var userResult = JSON.parse(data);

            userResult.response.user.blogs.forEach((blog) => {
                var blogId = blog.name;
                if (blogId.indexOf('.') < 0)
                    blogId = blogId + '.tumblr.com';

                this._deviceCollection.addOne(new TumblrBlogDevice(this.engine, this, {
                    blogId: blogId,
                    title: blog.title,
                }));
            });
        });
    },

    checkAvailable() {
        return Tp.Availability.AVAILABLE;
    },

    _ensureOAuth() {
        if (this._oauth)
            return this._oauth;

        return this._oauth = makeOAuthApi(this.constructor, this.engine);
    },

    queryInterface(iface) {
        switch (iface) {
        case 'subdevices':
            return this._deviceCollection;
        case 'tumblr-oauth':
            this._ensureOAuth();
            return this._oauth;
        default:
            return null;
        }
    },
});
