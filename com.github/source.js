// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Andrew Lim <alim16@stanford.edu>
//                Xiangyu Yue <xyyue@stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');
const crypto = require('crypto');

const GithubPoller = new Tp.ChannelClass({
    Name: 'GithubPoller',
    RequiredCapabilities: ['channel-state'],
    // we do not use the standard polling to comply with Github's policy
    // around polling (which require us to honor X-Poll-Interval and ETag)

    _init(engine, state, device, what, repoName, interval) {
        this.parent(engine, device);
        this._state = state;

        this._eventType = what;
        this.url = 'https://api.github.com/repos/' +
                    repoName + '/event';
        this._originalInterval = interval;
        this.interval = interval;

        this._etag = null;
    },

    get auth() {
        return "token " + this.device.accessToken;
    },

    get userAgent() {
        return 'ThingEngine-Github-Interface';
    },

    _nextTimeout() {
        this._timeout = setTimeout(() => {
            Q(this._onTick()).then(() => {
                this._nextTimeout();
            }).done();
        }, this.interval);
    },

    _doOpen() {
        this._nextTimeout();
        return this._onTick();
    },

    _onTick: function() {
        var options = {
            auth: this.auth,
            'user-agent': this.userAgent,
            extraHeaders: {}
        };
        if (this._etag)
            options.extraHeaders['If-None-Match'] = this._etag;

        return Helpers.Http.getStream(this.url, options).then((res) => {
            if (res.headers['x-poll-interval'])
                this.interval = Math.max(this._originalInterval, 1000 * parseInt(res.headers['x-poll-interval']));
            this._etag = res.headers['etag'];

            return Promise(function(callback, errback) {
                var data = '';
                res.setEncoding('utf8');
                res.on('data', function(chunk) {
                    data += chunk;
                });
                res.on('end', function() {
                    callback(data);
                });
                res.on('error', errback);
            });
        }).then((data) => {
            return this._onResponse(data);
        }).catch((error) => {
            if (error.code === 304) // Not Modified
                return;

            console.error('Error reading from upstream server: ' + error.message);
            console.error(error.stack);
        });
    },

    _onResponse: function(response) {
        var state = this._state;

        var parsed;
        try {
            parsed = JSON.parse(response);
        } catch(e) {
            console.log('Error parsing Github server response: ' + e.message);
            console.log('Full response was');
            console.log(response);
            return;
        }

        if (parsed.length == 0)
            return;

        var lastRead = state.get('last-read');
        console.log("Last read: " + lastRead);
        if (lastRead === undefined) {
            var d = new Date();
            lastRead = d.toISOString();
        }

        for (var event of parsed) {
            if (event.type !== this._eventType)
                continue;

            // note that we're comparing dates as strings
            // this is ok because the ISO format uses fixed width numbers
            // and puts the numbers most significant first
            if (event.created_at > lastRead)
                this.emit('data', event);
        }

        lastRead = parsed[parsed.length - 1].created_at;
        console.log("Setting last read: " + lastRead);
        state.set('last-read', lastRead);
    }
});

const GithubWebhook = new Tp.ChannelClass({
    Name: 'GithubWebhook',

    _init(engine, state, device, webhookType, repoName) {
        this.parent(engine, device);

        this._webhookType = webhookType;
        this._baseurl = 'https://api.github.com/repos/' +
                        repoName + '/hooks';
        this._hookId = null;
    },

    get auth() {
        return "token " + this.device.accessToken;
    },

    get userAgent() {
        return 'ThingEngine-Github-Interface';
    },

    _doClose: function() {
        var webhookApi = this.engine.platform.getCapability('webhook-api');
        webhookApi.unregisterWebhook(this._cleanId, this._listener);

        if (this._hookId !== null) {
            return Tp.Helpers.Http.request(this._baseurl + '/' + this._hookId, 'DELETE', null,
                { auth: this.auth, 'user-agent': this.userAgent });
        }
    },

    _doOpen: function() {
        var webhookApi = this.engine.platform.getCapability('webhook-api');

        // clean the webhook url
        this._cleanId = this.uniqueId.replace(/[^.a-z0-9\-]/g, '-');
        var url = webhookApi.getWebhookBase() + '/' + this._cleanId;

        this._listener = this._onCallback.bind(this);
        webhookApi.registerWebhook(this._cleanId, this._listener);

        var data = {
            name: 'web',
            config: {
                url: url,
                content_type: 'json',
                secret: crypto.randomBytes(16).toString('hex')
            },
            events: [this._webhookType]
        };
        return Tp.Helpers.Http.post(this._baseurl, JSON.stringify(data), {
            auth: this.auth, 'user-agent': this.userAgent,
            dataContentType: 'application/json'
        }).then((data) => {
            var parsed = JSON.parse(data);
            this._hookId = parsed.id;
        }).catch(function(e) {
            console.error('Failed to subscribe to Github: ' + e.message);
            console.error(e.stack);
        });
    },

    _onCallback: function(method, query, headers, payload) {
        // ignore pings
        if (headers['x-github-event'] && headers['x-github-event'] !== this._webhookType)
            return;

        this.emit('data', payload);
    }
})

module.exports = function(webhookType, eventType, interval, makeEvent, formatter) {
    return new Tp.ChannelClass({
        Name: 'GithubChannel' + eventType,
        RequiredCapabilities: ['channel-state'],
        interval: interval,

        _init: function(engine, state, device, params) {
            this.parent(engine, state, device);
            this._state = state;

            this._params = params.slice(0, 1);
            this._repoName = this._params[0];
            if (!this._repoName)
                throw new TypeError("Missing required parameter");
            if (this._repoName.indexOf('/') < 0)
                this._repoName = device.userName + '/' + this._repoName;

            this.filterString = this._repoName;

            this._hasWebhooks = engine.platform.hasCapability('webhook-api');
            if (this._hasWebhooks) {
                this._webhook = new GithubWebhook(engine, state, device, webhookType, this._repoName);
                this._webhook.on('data', this._onData.bind(this));
            } else {
                this._poller = new GithubPoller(engine, state, device, eventType, this._repoName, interval);
                this._poller.on('data', this._onData.bind(this));
            }
        },

        _doOpen() {
            if (this._hasWebhooks) {
                this._webhook.uniqueId = this.uniqueId;
                return this._webhook.open();
            } else {
                this._poller.uniqueId = this.uniqueId;
                return this._poller.open();
            }
        },

        _doClose() {
            if (this._hasWebhooks)
                return this._webhook.close();
            else
                return this._poller.close();
        },

        formatEvent: formatter,
        _onData: makeEvent,
    });
}
