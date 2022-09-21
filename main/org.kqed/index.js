// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of org.kqed
//
// Copyright 2022 undefined <undefined>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

const AUDIO_PROGRAM_URLS = {
    newscast: 'https://www.omnycontent.com/d/playlist/0af137ef-751e-4b19-a055-aaef00d2d578/ffca7e9f-6831-41c5-bcaf-aaef00f5a073/4a2649d7-e8af-4a0d-b374-aaf0016ca5af/podcast.rss'
    // newscast: 'https://apifeeds.kqed.org/feeds/newscast/'
    // now: 'https://www.omnycontent.com/d/playlist/0af137ef-751e-4b19-a055-aaef00d2d578/87fdd794-f90e-4280-920f-ab89016e8062/d72d17c7-e1c8-4763-98eb-ab89016ed36a/podcast.rss',
    // on_our_watch: 'https://feeds.npr.org/510360/podcast.xml',
    // mindshift: 'https://feeds.megaphone.fm/KQINC5764600429',
    // soldout: 'https://feeds.megaphone.fm/soldout',
    // bay_curious: 'https://ww2.kqed.org/news/category/bay-curious-podcast/feed/podcast',
    // right_nowish: 'https://ww2.kqed.org/arts/programs/rightnowish/feed/podcast',
    // the_bay: 'https://feeds.megaphone.fm/KQINC8259786327',
    // forum: 'https://feeds.megaphone.fm/KQINC9557381633',
    // the_california_report: 'https://ww2.kqed.org/news/tag/tcram/feed/podcast',
    // the_california_report_magazine: 'https://ww2.kqed.org/news/tag/tcrmag/feed/podcast',
    // political_breakdown: 'https://ww2.kqed.org/news/tag/political-breakdown/feed/podcast',
    // american_suburb: 'https://ww2.kqed.org/news/series/american-suburb-podcast/feed/podcast',
    // the_leap: 'https://ww2.kqed.org/news/programs/the-leap/feed/podcast',
    // perspectives: 'https://ww2.kqed.org/perspectives/category/perspectives/feed/',
    // political_mind_of_jerry_brown: 'https://ww2.kqed.org/news/series/jerrybrown/feed/podcast/',
    // science_news: 'https://ww2.kqed.org/science/category/science-podcast/feed/podcast',

    // one_a: 'https://feeds.npr.org/510316/podcast.xml',
    // bbc_world_series: 'https://podcasts.files.bbci.co.uk/p02nq0gn.rss',
    // city_arts_lectures: 'https://www.cityarts.net/feed/',
    // code_switch_life_kit: 'https://feeds.npr.org/510312/podcast.xml',
    // freakonomics_radio: 'https://feeds.feedburner.com/freakonomicsradio',
    // fresh_air: 'https://feeds.npr.org/381444908/podcast.xml',
    // hidden_brain: 'https://feeds.npr.org/510308/podcast.xml',
    // how_i_built_this_with_guy_raz: 'https://feeds.npr.org/510313/podcast.xml',
    // inside_europe: 'https://partner.dw.com/xml/podcast_inside-europe',
    // latino_usa: 'https://feeds.npr.org/510016/podcast.xml',
    // live_from_here: 'https://feeds.publicradio.org/public_feeds/a-prairie-home-companion-highlights/rss/rss',
    // marketplace: 'https://feeds.publicradio.org/public_feeds/marketplace-pm/rss/rss',
    // masters_of_scale: 'https://rss.art19.com/masters-of-scale',
    // moth_radio_hour: 'http://feeds.themoth.org/themothpodcast',
    // new_yorker_radio_hour: 'https://feeds.feedburner.com/newyorkerradiohour',
    // on_the_media: 'http://feeds.wnyc.org/onthemedia',
    // our_body_politic: 'https://feeds.simplecast.com/_xaPhs1s',
    // pbs_news_hour: 'https://www.pbs.org/newshour/feeds/rss/podcasts/show',
    // perspectives: 'https://feeds.megaphone.fm/KQINC5187828231',
    // planet_money: 'https://feeds.npr.org/510289/podcast.xml',
    // pris_the_world: 'http://feeds.feedburner.com/pri/theworld',
    // radiolab: 'https://feeds.wnyc.org/radiolab',
    // reveal: 'http://feeds.revealradio.org/revealpodcast',
    // says_you: 'https://saysyou.libsyn.com/rss',
    // science_friday: 'http://feeds.wnyc.org/science-friday',
    // selected_shorts: 'https://feeds.megaphone.fm/selectedshorts',
    // snap_judgment: 'https://feeds.feedburner.com/snapjudgment-wnyc',
    // tech_nation: 'https://technation.podomatic.com/rss2.xml',
    // ted_radio_hour: 'https://feeds.npr.org/510298/podcast.xml',
    // the_takeaway: 'https://feeds.feedburner.com/takeawaypodcast',
    // this_american_life: 'https://www.thisamericanlife.org/podcast/rss.xml',
    // wait_wait_dont_tell_me: 'https://feeds.npr.org/344098539/podcast.xml',
    // washington_week: 'http://feeds.pbs.org/pbs/weta/washingtonweek-audio',
    // white_lies: 'https://feeds.npr.org/510343/podcast.xml',
    // world_affairs: 'https://worldaffairs.libsyn.com/rss'
}


const DEVICE_ERROR = {
    no_postcasts_available: 'no_podcasts_available',
    unsupported_version: 'unsupported_version'
};

function _removeHtmlCode(str) {
    return str.replace(/<[^>]*>?/gm, '');
}

function _trimExtraWords(str) {
    const rmStr1 = "Additional Reading:";
    const rmStr2 = "With Disruptive Classroom Behaviors on the Rise, Restorative Justice Practices Can Help";
    const rmStr3 = "Sign up for the MindShift email newsletter. You can show your love by donating!";
    return str.replace(rmStr1, '').replace(rmStr2, '').replace(rmStr3, '').replace(/(\r\n|\n|\r)/gm, '');
}

async function fetchContent(url) {
    return Tp.Helpers.Http.get(url).then(
        (result) => Tp.Helpers.Xml.parseString(result)
    ).then(
        (parsed) => {
            const podcasts = parsed.rss.channel[0];
            if (podcasts.item === undefined)
                throw new Error(DEVICE_ERROR.no_postcast_available);
            return podcasts.item.map((item) => {
                return ({
                    title: _removeHtmlCode(item.title[0]),
                    description:_trimExtraWords(_removeHtmlCode(item.description[0])),
                    author: item['itunes:author'][0] || "",
                    link: item['enclosure'][0]['$'].url,
                    date: new Date(item.pubDate[0]),
                    duration: parseInt(item['itunes:duration'][0])
                });
            });
        }).catch((err) => {
        if (err.code === 404)
            throw new Error("Invalid URL");
        else
            throw err;
    });
}

module.exports = class KqedDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);
        this._playedItems = new Set();
        /**
          * @type {{ uniqueId: string, timestamp: number }|null}
          */
        this._lastPlay = null;
    }

    _testMode() {
        return process.env.TEST_MODE === '1';
    }

    /**
     *
     * @param {string} blob
     * @returns
     */
    async _resolveShoutcastURL(blob) {
        const line = blob.split('\n').find((x) => x.startsWith('File'));
        if (!line) {
            console.log(`failed to parse shoutcast`, blob);
            throw new Error(`Cannot parse Shoutcast playlist`);
        }
        return line.replace(/^File[^=+]=/, '');
    }

    async _resolvePlayableURL(uriList) {
        const url = uriList.trim().split('\n')[0];
        // HACK...
        if (url.endsWith('m3u'))
            return this._resolvePlayableURL(await Tp.Helpers.Http.get(url));
        if (url.endsWith('pls'))
            return this._resolveShoutcastURL(await Tp.Helpers.Http.get(url));
        return url;
    }

    async _get_content() {
        const contents = await fetchContent();
        let url = "";
        let duration = 0;
        for (const item of contents) {
            if (!this._playedItems.has(item)) {
                this._playedItems.add(item);
                url = item.link;
                duration = item.duration;
                break;
            }
        }
        if (url.length) {
            return {url: url, duration: duration};
        } else {
            throw new Error(DEVICE_ERROR.no_postcasts_available);
        }
    }

    async do_kqed_play({}, env) {
        // HACK: prevent repeated calls to play from the same program
        // (generated by something like "play the radio")
        const now = Date.now();
        if (this._lastPlay && this._lastPlay.uniqueId === env.app.uniqueId && now - this._lastPlay.timestamp < 300000) {
            this._lastPlay.timestamp = now;
            return;
        }
        this._lastPlay = {
            uniqueId: env.app.uniqueId,
            timestamp: now
        };

        const item = await this._get_content();

        // const playable_link = await this._resolvePlayableURL(await Tp.Helpers.Http.get(item.url));
        const playable_link = item.url;
        console.log(`Playing from ${playable_link}`);

        if (this._testMode()) return;

        const engine = this.engine;
        if (engine.audio && engine.audio.playURLs) {
            if (!await engine.audio.checkCustomPlayer({ type: 'url' }, env.conversation))
                throw new Error(DEVICE_ERROR.unsupported_version);

            // play asynchronously: playing will call requestAudio on the audio controller,
            // which will wait until the agent is done speaking, so we must return here
            engine.audio.playURLs(this, [playable_link], env.conversation).catch((err) => {
                console.error(`Failed to play URL`, err);
            });
            return;
        }

        const audio_player = this.platform.getCapability('audio-player');
        console.log("audio-player");
        if (!audio_player) {
            throw new Error(DEVICE_ERROR.unsupported_version);
        } else {
            // const playable_link = this._http_post(url);
            try {
                audio_player.play(playable_link);
                return;
            } catch(err) {
                throw new Error(DEVICE_ERROR.service_unavailable);
            }
        }
    }

    async *get_podcasts({ program }) {
        try {
            if (!program)
                program = 'mindshift';
            const url = AUDIO_PROGRAM_URLS[program];
            const contents = await fetchContent(url);
            for (const item of contents)
                yield item;
        } catch(error) {
            throw new Error(DEVICE_ERROR.service_unavailable);
        }
    }
};