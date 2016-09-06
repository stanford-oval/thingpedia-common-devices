// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//                Heri Zhao and Jiayu Ye
//
// See COPYING for details

const Tp = require('thingpedia');

const HUB_URL = "https://pubsubhubbub.appspot.com/subscribe";

const SingleChannelSubscription = new Tp.ChannelClass({
    Name: 'YouTubeSingleChannelSourceChannel',
    RequiredCapabilities: ['webhook-api'],

    _init: function(engine, device, params) {
        this.parent();
        this.engine = engine;
        this.device = device;

        this._param = params[0];
        this._channelId = this._param;
        if (!this._channelId)
            throw new Error('Missing required parameter');
        if (this._channelId.startsWith('https://www.youtube.com/channel/'))
            this._channelId = this._channelId.substr('https://www.youtube.com/channel/'.length);
        this._filterString = this._channelId;

        this._listener = null;
    },

    _doClose: function() {
        var webhookApi = this.engine.platform.getCapability('webhook-api');
        webhookApi.unregisterWebhook(this.uniqueId, this._listener);
    },

    _doOpen: function() {
        var webhookApi = this.engine.platform.getCapability('webhook-api');
        var url = webhookApi.getWebhookBase() + '/' + this.uniqueId;

        this._listener = this._onCallback.bind(this);
        webhookApi.registerWebhook(this.uniqueId, this._listener);

        var data = "hub.topic=https://www.youtube.com/xml/feeds/videos.xml?channel_id=" +
                encodeURIComponent(this._channelId) +
               "&hub.callback=" + encodeURIComponent(url)
               "&hub.verify=sync&hub.mode=subscribe";

        Tp.Helpers.Http.post(HUB_URL, data).catch(function(e) {
            console.error('Failed to subscribe to YouTube: ' + e.message);
            console.error(e.stack);
        }).done();
    },

    _onCallback: function(method, query, headers, payload) {
        // method is 'GET' or 'POST'
        // query is the parsed version of the stuff after ? in the URL
        // so if the call is ?foo=one&bar=two
        // query is { foo: 'one', bar: 'two' }
        // headers is an object with HTTP headers (lowercase)
        // payload is the parsed request body, usually JSON

        if (!query["hub.challenge"]) {
            if (!payload.feed)
                return;
            var entry = payload.feed.entry[0];
            if (!entry)
                return;
            var channelTitle = entry.author[0].name[0];
            var title = entry.title[0];
            var link = entry.link[0].$.href;
            this.emitEvent([this._param, channelTitle, title, link]);
        }

        return { code: 200, response: query["hub.challenge"], contentType: 'text/plain' };
    }
});

const AllChannelsSubscription = new Tp.ChannelClass({
    Name: 'AllChannelsSubscription',
    Extends: Tp.HttpPollingTrigger,
    interval: 24 * 3600 * 1000,

    _init(engine, device, params) {
        this.parent(engine, device);

        this._subscriptions = new Map();
        this.url = 'https://www.googleapis.com/youtube/v3/subscriptions?part=id,snippet&mine=true';
        this.useOAuth2 = this.device;

        this._dataListener = this._onData.bind(this);
    },

    _onData(data) {
        this.emitEvent(data);
    },

    _onResponse(data) {
        var parsed = JSON.parse(data);

        var newChannels = new Set();
        parsed.items.forEach((item) => {
            newChannels.add(item.snippet.resourceId.channelId);
        });

        var toAdd = [];
        var toRemove = [];

        for (var channelId of this._subscriptions.keys()) {
            if (!newChannels.has(channelId))
                toRemove.push(channelId);
        }
        for (var channelId of newChannels) {
            if (!this._subscriptions.has(channelId))
                toAdd.push(channelId);
        }

        var adding = toAdd.map((channelId) => {
            var c = new SingleChannelSubscription(channelId, this.engine, this.device);
            this._subscriptions.set(channelId, c);
            c.on('data', this._dataListener);
            return c.open().then(() => c);
        });
        var removing = toRemove.map((channelId) => {
            var c = this._subscriptions.get(channelId);
            this._subscriptions.delete(channelId);
            c.removeListener('data', this._dataListener);
            return c.close();
        });

        return Q.all(adding.concat(removing)).catch((e) => {
            console.error('Error opening subscription channels: ' + e.message);
            console.error(e.stack);
        });
    }
})

module.exports = new Tp.ChannelClass({
    Name: 'YoutubeSourceChannel',
    RequiredCapabilities: ['webhook-api'],

    _init: function(engine, device, params) {
        this.parent(engine, device, params);

        if (params[0] !== null && params[0] !== undefined) {
            this._channelId = params[0];
            this.filterString = this._channelId;
            this._channel = new SingleChannelSubscription(this._channelId, this.engine, this.device);
        } else {
            this._channel = new AllChannelsSubscription(this.engine, this.device);
        }

        this._channel.on('data', this._onEvent.bind(this));
    },

    formatEvent(event) {
        var channelId = event[0];
        var channelTitle = event[1];
        var title = event[2];
        var link = event[3];
        return [{
            type: 'rdl',
            displayTitle: "New video uploaded by %s".format(channelTitle),
            displayText: title,
            callback: link,
            webCallback: link
        }];
    },

    _onEvent: function(event) {
        this.emitEvent(event);
    },

    _doOpen: function() {
        return this._channel.open();
    },

    _doClose: function() {
        return this._channel.close();
    }
});
