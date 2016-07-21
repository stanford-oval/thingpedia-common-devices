// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//                Heri Zhao and Jiayu Ye
//
// See COPYING for details

const Tp = require('thingpedia');

const HUB_URL = "https://pubsubhubbub.appspot.com/subscribe";

module.exports = new Tp.ChannelClass({
    RequiredCapabilities: ['webhook-api'],
    Name: 'YouTubeSourceChannel',

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
