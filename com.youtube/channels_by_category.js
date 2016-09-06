// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

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

module.exports = new Tp.ChannelClass({
    Name: 'YouTubeChannelsByCategoryChannel',

    formatEvent(event) {
        var categoryId = event[0];
        var channelId = event[1];
        var title = event[2];
        var description = event[3];
        var thumbnail = event[4];

        var link = 'http://www.youtube.com/channel/' + channelId;

        return [{
            type: 'rdl',
            displayTitle: title,
            displayText: description,
            callback: link,
            webCallback: link
        }, { type: 'picture', url: thumbnail }];
    },

    invokeQuery(filters) {
        var categoryId = filters[0];
        if (!CATEGORIES[categoryId])
            return [];

        var category = CATEGORIES[categoryId];

        var url = Url.parse('https://www.googleapis.com/youtube/v3/channels', true);
        url.query.part = 'id,snippet';
        url.query.categoryId = category.id;
        url.query.hl = this.engine.platform.locale;
        url.query.maxResults = 5;
        return Tp.Helpers.Http.get(Url.format(url), { useOAuth2: this.device }).then((data) => {
            var parsed = JSON.parse(data);
            return parsed.items.map((item) => {
                return [categoryId, item.id, item.snippet.localized.title, item.snippet.localized.description, item.snippet.thumbnails.high.url];
            });
        });
    },
});
