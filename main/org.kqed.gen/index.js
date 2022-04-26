// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of org.kqed
//
// Copyright 2022 undefined <undefined>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');
const interpolate = require('string-interp');

const RSS_URL = "https://www.omnycontent.com/d/playlist/0af137ef-751e-4b19-a055-aaef00d2d578/87fdd794-f90e-4280-920f-ab89016e8062/d72d17c7-e1c8-4763-98eb-ab89016ed36a/podcast.rss";

const DEVICE_ERROR = {
    no_postcasts_available: 'no_podcasts_available',
    unsupported_version: 'unsupported_version',
    service_unavailable: 'service_unavailable'
};

class KqedDialogueGenHandler extends Tp.AbstractGeniescriptHandler {
    /**
     *
     * @param {string} locale
     * @param {string} timezone
     */
    constructor(locale, timezone) {
        super(Tp.DialogueHandler.Priority.PRIMARY, 'org.kqed');
        this._locale = locale;
        this._timezone = timezone;
        this._ = KqedGenDevice.gettext.gettext;
        this._item = 0;
        this._podcasts = [];
        this._askedResume = false;

        let user_target = '$dialogue @org.thingpedia.dialogue.transaction.execute;\n' +
            '@org.kqed.gen.kqed_podcasts();';
        this.dlg = new Tp.GeniescriptDlg(user_target, "@org.kqed.gen.kqed_podcasts");
    }

    _interp(string, args) {
        return interpolate(string, args, {
            locale: this._locale,
            timezone: this._timezone,
        });
    }

    // get priority() {
    //     return Tp.DialogueHandler.Priority.PRIMARY;
    // }
    //
    // get icon() {
    //     return 'org.kqed';
    // }

    getState() {
        return { lastQuerySuggestion: this._lastQuerySuggestion };
    }

    async initialize(initialState) {
        await super.initialize();
        if (initialState)
            this._lastQuerySuggestion = initialState.lastQuerySuggestion;
        this._podcasts = await preFetchItems();
        return null;
    }

    reset() {
        this._lastQuerySuggestion = null;
        this._item = 0;
        this._podcasts = [];
        this._askedResume = false;
    }

    async *yes_no() {
        let self = this;
        return yield * self.dlg.expect(new Map(Object.entries({
            "\\b(yes|yeah|yep|sure|go ahead)\\b": async function() {
                return true;
            },
            "\\b(no|nah|nope)\\b": async function() {
                return false;
            }
        })));
    }

    play() {
        let self = this;
        this.dlg.say([
            self._interp(self._("Play KQED now."), {}),
            {
                type: 'rdl',
                webCallback: `${self._podcasts[self._item].link}::${self._item}`,
                displayTitle: `${self._podcasts[self._item].title}`,
            },
            {
                type: 'text',
                text: `${self._podcasts[self._item].description}`
            }
        ]);
    }

    stop() {
        let self = this;
        self.dlg.say(
            [self._interp(self._("Stop playing."), {})]
        );
    }

    next() {
        let self = this;
        self.dlg.say([
            this._interp(this._("Play next."), {}),
            {
                type: 'rdl',
                webCallback: `${this._podcasts[this._item].link}::${this._item}`,
                displayTitle: `${this._podcasts[this._item].title}`,
            },
            {
                type: 'text',
                text: `${this._podcasts[this._item].description}`
            },
            // TODO: call do_kqed_play
            this._interp(this._("Play next?"), {}),
        ]);
    }

    resume() {
        // TODO: make a combined expect and say
        let self = this;
        this.dlg.say([
            self._interp(this._("resume playing?"), {})
        ]);
    }

    async *logic() {
        let self = this;
        while (true) {
            yield * self.dlg.expect(new Map(Object.entries({
                "play kqed": ( async function*() {
                    if (self._item) {
                        self.resume();
                        if (yield * self.yes_no())
                            self.play();
                        else
                            self.stop();

                    } else {
                        self.play();
                        self.dlg.say([
                            // TODO: call do_kqed_play
                            self._interp(self._("Play next?"), {}),
                        ]);
                        if (yield * self.yes_no())
                            self.next();
                        else
                            self.stop();
                    }
                }),
            })));
        }
    }
}

async function preFetchItems() {
    const blob = await Tp.Helpers.Http.get(RSS_URL).then(
        (result) => Tp.Helpers.Xml.parseString(result)
    ).then(
        (parsed) => {
            const podcasts = parsed.rss.channel[0];
            if (podcasts.item === undefined)
                throw new Error(DEVICE_ERROR.no_postcast_available);
            return podcasts.item.map((item) => {
                return ({
                    id: new Tp.Value.Entity(item.guid[0]['_'], null),
                    title: item.title[0],
                    description: item.description[0],
                    link: item['media:content'][0]['$'].url,
                    // link: item.enclosure[0]['$'].url,
                    date: new Date(item.pubDate[0]),
                    duration: Number(item['itunes:duration'][0])
                });
            });
        }).catch((err) => {
        if (err.code === 404)
            throw new Error("Invalid URL");
        else
            throw new Error(DEVICE_ERROR.service_unavailable);
    });
    return blob.slice(0 ,3);
}

async function* fetchItems() {
    const items = await Tp.Helpers.Http.get(RSS_URL).then(
        (result) => Tp.Helpers.Xml.parseString(result)
    ).then(
        (parsed) => {
            const podcasts = parsed.rss.channel[0];
            if (podcasts.item === undefined)
                throw new Error(DEVICE_ERROR.no_postcast_available);
            return podcasts.item.map((item) => {
                return ({
                    id: new Tp.Value.Entity(item.guid[0]['_'], null),
                    title: item.title[0],
                    description: item.description[0],
                    link: item['media:content'][0]['$'].url,
                    // link: item.enclosure[0]['$'].url,
                    date: new Date(item.pubDate[0]),
                    duration: Number(item['itunes:duration'][0])
                });
            });
        }).catch((err) => {
        if (err.code === 404)
            throw new Error("Invalid URL");
        else
            throw new Error(DEVICE_ERROR.service_unavailable);
    });
    for (const item of items)
        yield item;
}

class KqedGenDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'org.kqed';
        this.name = "KQED Now";
        this.description = "A daily News podcast from KQED";
        this._dialogueHandler = new KqedDialogueGenHandler(this.platform.locale, this.platform.timezone);
        console.log("kqed gen loaded");
    }
    
    queryInterface(iface) {
        switch (iface) {
        case 'dialogue-handler':
            return this._dialogueHandler;

        default:
            return super.queryInterface(iface);
        }
    }
    
    async *get_kqed_podcasts() {
        try {
            yield* fetchItems();
        } catch(error) {
            throw new Error(DEVICE_ERROR.service_unavailable);
        }
    }

    pprint() {
        console.log("here");
        return "kqed";
    }

    async do_kqed_play(env, playable_link) {
        const engine = this.engine;
        if (engine.audio && engine.audio.playURLs) {
            if (!await engine.audio.checkCustomPlayer({ type: 'url' }, env.conversation))
                throw new Error(DEVICE_ERROR.unsupported_version);
            // play asynchronously: playing will call requestAudio on the audio controller,
            // which will wait until the agent is done speaking, so we must return here
            engine.audio.playURLs(this, [playable_link], env.conversation).catch((e) => {
                console.error(`Failed to play radio URL`, e);
            });
            return;
        }

        const audio_player = this.platform.getCapability('audio-player');
        if (!audio_player) {
            throw new Error(DEVICE_ERROR.unsupported_version);
        } else {
            // const playable_link = this._http_post(url);
            try {
                audio_player.play(playable_link);
            } catch(e) {
                throw new Error(DEVICE_ERROR.service_unavailable);
            }
        }
    }
}
module.exports = KqedGenDevice;