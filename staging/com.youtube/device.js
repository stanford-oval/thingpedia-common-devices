// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details
"use strict";

const Url = require('url');
const Tp = require('thingpedia');

const CATEGORIES = {
  best_of_youtube: {
    id: "GCQmVzdCBvZiBZb3VUdWJl",
    title: "Best of YouTube"
  },
  recommended: {
    id: "GCUmVjb21tZW5kZWQgZm9yIFlvdQ",
    title: "Recommended for You"
  },
  paid: {
    id: "GCUGFpZCBDaGFubmVscw",
    title: "Paid Channels"
  },
  music: {
    id: "GCTXVzaWM",
    title: "Music"
  },
  comedy: {
    id: "GCQ29tZWR5",
    title: "Comedy"
  },
  film_and_entertainment: {
    id: "GCRmlsbSAmIEVudGVydGFpbm1lbnQ",
    title: "Film & Entertainment"
  },
  gaming: {
    id: "GCR2FtaW5n",
    title: "Gaming"
  },
  beauty_and_fashion: {
    id: "GCQmVhdXR5ICYgRmFzaGlvbg",
    title: "Beauty & Fashion"
  },
  from_tv: {
    id: "GCRnJvbSBUVg",
    title: "From TV"
  },
  automotive: {
    id: "GCQXV0b21vdGl2ZQ",
    title: "Automotive"
  },
  animation: {
    id: "GCQW5pbWF0aW9u",
    title: "Animation"
  },
  sports: {
    id: "GCU3BvcnRz",
    title: "Sports"
  },
  diy: {
    id: "GCSG93LXRvICYgRElZ",
    title: "How-to & DIY"
  },
  tech: {
    id: "GCVGVjaA",
    title: "Tech"
  },
  science: {
    id: "GCU2NpZW5jZSAmIEVkdWNhdGlvbg",
    title: "Science & Education"
  },
  cooking: {
    id: "GCQ29va2luZyAmIEhlYWx0aA",
    title: "Cooking & Health"
  },
  causes: {
    id: "GCQ2F1c2VzICYgTm9uLXByb2ZpdHM",
    title: "Causes & Non-profits"
  },
  news_and_politics: {
    id: "GCTmV3cyAmIFBvbGl0aWNz",
    title: "News & Politics"
  },
  lifestyle: {
    id: "GCTGlmZXN0eWxl",
    title: "Lifestyle"
  }
};

module.exports = class YouTubeDevice extends Tp.BaseDevice {
    static get runOAuth2() {
        return Tp.Helpers.OAuth2({
            kind: 'com.youtube',
            scope: ['openid','profile','email',
                    'https://www.googleapis.com/auth/youtube.force-ssl',
                    'https://www.googleapis.com/auth/youtube',
                    'https://www.googleapis.com/auth/youtube.readonly',
                    'https://www.googleapis.com/auth/youtube.upload'],
            authorize: 'https://accounts.google.com/o/oauth2/auth',
            get_access_token: 'https://www.googleapis.com/oauth2/v3/token',
            set_access_type: true,
            callback: function(engine, accessToken, refreshToken) {
                var auth = 'Bearer ' + accessToken;
                return Tp.Helpers.Http.get('https://www.googleapis.com/oauth2/v2/userinfo', { auth: auth, accept: 'application/json' })
                .then((response) => {
                    const parsed = JSON.parse(response);
                    return engine.devices.loadOneDevice({ kind: 'com.youtube',
                                                          accessToken: accessToken,
                                                          refreshToken: refreshToken,
                                                          userId: parsed.id,
                                                          userName: parsed.name }, true);
                });
            }
        });
    }

    constructor(engine, state) {
        super(engine, state);

        this.uniqueId = 'com.youtube-' + this.userId;
        this.name = "YouTube Account " + this.userName;
        this.description = "This is your YouTube Account. You can use it to search for videos, subscribe to channels or upload new videos.";
    }

    get userId() {
        return this.state.userId;
    }

    get userName() {
        return this.state.userName;
    }

    get_channels_by_category({ category_id }) {
        if (!CATEGORIES[category_id])
            return Promise.resolve([]);

        const category = CATEGORIES[category_id];
        const url = Url.parse('https://www.googleapis.com/youtube/v3/channels', true);
        url.query.part = 'id,snippet';
        url.query.categoryId = category.id;
        url.query.hl = this.engine.platform.locale;
        url.query.maxResults = 5;
        return Tp.Helpers.Http.get(Url.format(url), { useOAuth2: this }).then((data) => {
            const parsed = JSON.parse(data);
            return parsed.items.map((item) => {
                return {
                    channel_id: item.id,
                    title: item.snippet.localized.title,
                    description: item.snippet.localized.description,
                    thumbnail: item.snippet.thumbnails.high.url
                };
            });
        });
    }

    get_list_subscriptions() {
        return Tp.Helpers.Http.get('https://www.googleapis.com/youtube/v3/subscriptions?part=id,snippet&mine=true',
            { useOAuth2: this }).then((data) => {
            const parsed = JSON.parse(data);
            return parsed.items.map((item) => {
                return {
                    channel_id: item.snippet.resourceId.channelId,
                    title: item.snippet.title,
                    description: item.snippet.description,
                    thumbnail: item.snippet.thumbnails.high.url
                };
            });
        });
    }

    get_search_channel({ query }) {
        var url = Url.parse('https://www.googleapis.com/youtube/v3/search', true);
        url.query.part = 'id,snippet';
        url.query.safeSearch = 'none';
        url.query.type = 'channel';
        url.query.q = query;
        url.query.maxResults = 5;
        return Tp.Helpers.Http.get(Url.format(url), { useOAuth2: this }).then((data) => {
            const parsed = JSON.parse(data);
            return parsed.items.map((item) => {
                return {
                    channel_id: item.id.channelId,
                    title: item.snippet.title,
                    description: item.snippet.description,
                    thumbnail: item.snippet.thumbnails.high.url
                };
            });
        });
    }

    get_search_videos({ query, count }) {
        if (count === null || count === undefined)
            count = 1;

        const url = Url.parse('https://www.googleapis.com/youtube/v3/search', true);
        url.query.part = 'id,snippet';
        url.query.safeSearch = 'none';
        url.query.type = 'video';
        url.query.q = query;
        url.query.maxResults = count;
        return Tp.Helpers.Http.get(Url.format(url), { useOAuth2: this }).then((data) => {
            const parsed = JSON.parse(data);
            return parsed.items.map((item) => {
                const link = 'https://www.youtube.com/watch?v=' + encodeURIComponent(item.id.videoId);
                return {
                    video_id: item.id.videoId,
                    channel_id: item.snippet.channelId, // item.snippet.channelTitle,
                    title: item.snippet.title,
                    description: item.snippet.description,
                    thumbnail: item.snippet.thumbnails.high.url,
                    video_url: link
                };
            });
        });
    }

    get_list_videos({ channel_id }) {
        const url = Url.parse('https://www.googleapis.com/youtube/v3/search', true);
        url.query.part = 'id,snippet';
        url.query.safeSearch = 'none';
        url.query.type = 'video';
        url.query.channelId = String(channel_id);
        return Tp.Helpers.Http.get(Url.format(url), { useOAuth2: this }).then((data) => {
            const parsed = JSON.parse(data);
            return parsed.items.map((item) => {
                const link = 'https://www.youtube.com/watch?v=' + encodeURIComponent(item.id.videoId);
                return {
                    video_id: item.id.videoId,
                    channel_id: item.snippet.channelId, // item.snippet.channelTitle,
                    channel_title: item.snippet.channelTitle,
                    title: item.snippet.title,
                    description: item.snippet.description,
                    thumbnail: item.snippet.thumbnails.high.url,
                    video_url: link
                };
            });
        });
    }
};
