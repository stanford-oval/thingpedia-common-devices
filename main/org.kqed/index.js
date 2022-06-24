// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of org.kqed
//
// Copyright 2022 undefined <undefined>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');
const TT = require('thingtalk');
const interpolate = require('string-interp');

const RSS_URL = "https://www.omnycontent.com/d/playlist/0af137ef-751e-4b19-a055-aaef00d2d578/87fdd794-f90e-4280-920f-ab89016e8062/d72d17c7-e1c8-4763-98eb-ab89016ed36a/podcast.rss";

const DEVICE_ERROR = {
    no_postcasts_available: 'no_podcasts_available',
    unsupported_version: 'unsupported_version',
    service_unavailable: 'service_unavailable'
};

class KqedDialogueHandler {
    /**
     *
     * @param {string} locale
     * @param {string} timezone
     */
    constructor(locale, timezone) {
        this._locale = locale;
        this._timezone = timezone;
        this._ = KqedDevice.gettext.gettext;
        this._item = 0;
        this._podcasts = [];
        this._askedResume = false;
    }

    _interp(string, args) {
        return interpolate(string, args, {
            locale: this._locale,
            timezone: this._timezone,
        });
    }

    get priority() {
        return Tp.DialogueHandler.Priority.PRIMARY;
    }

    get icon() {
        return 'org.kqed';
    }

    getState() {
        return { lastQuerySuggestion: this._lastQuerySuggestion };
    }

    async initialize(initialState) {
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

    /**
     *
     * @param {string} command
     * @returns {Tp.DialogueHandler.CommandAnalysisResult}
     */
    async analyzeCommand(utterance) {
        let ret = { 
            confident: Tp.DialogueHandler.Confidence.OUT_OF_DOMAIN_COMMAND, 
            utterance: utterance, 
            user_target: ''
        };
        const prefixRegExp = new RegExp(this._("^\\s*kqed now\\b"), 'i');
        const prefixMatch = prefixRegExp.exec(utterance);
        if (prefixMatch) {
            ret.confident = Tp.DialogueHandler.Confidence.EXACT_IN_DOMAIN_COMMAND;
            ret.user_target = '$dialogue @org.thingpedia.dialogue.transaction.execute;\n' +
                              '@org.kqed.kqed_podcasts();';
            if (this._item)
                ret.answerType = 'continue';
            else
                ret.answerType = 'play';
            this._lastQuerySuggestion = utterance;
            return ret;
        }
        
        if (this._lastQuerySuggestion) {
            const yesRegExp = new RegExp(this._("\\b(yes|yeah|yep|sure|go ahead)\\b"));
            const yesMatch = yesRegExp.exec(utterance);
            if (yesMatch) {
                ret.confident = Tp.DialogueHandler.Confidence.EXACT_IN_DOMAIN_FOLLOWUP;
                ret.user_target = '$dialogue @org.thingpedia.dialogue.transaction.execute;\n' +
                                  '@org.kqed.kqed_podcasts();';
                if (this._askedResume)
                    ret.answerType = 'play';
                else
                    ret.answerType = 'next';
                this._askedResume = false;
                return ret;
            }
            const noRegExp = new RegExp(this._("\\b(no|nah|nope)\\b"));
            const noMatch = noRegExp.exec(utterance);
            if (noMatch) {
                ret.confident = Tp.DialogueHandler.Confidence.EXACT_IN_DOMAIN_FOLLOWUP;
                ret.user_target = '$dialogue @org.thingpedia.dialogue.transaction.execute;\n' +
                                  '@org.kqed.kqed_podcasts();';
                if (this._askedResume) {
                    ret.answerType = 'play';
                    this._askedResume = false;
                    this._item = 0;
                } else {
                    ret.answerType = 'stop';
                    this._lastQuerySuggestion = null;
                }
                return ret;
            }
        }
        return ret;
    }

    /**
     *
     * @param {Tp.DialogueHandler.CommandAnalysisResult} analysis
     * @returns {Tp.DialogueHandler.ReplyResult}
     */
    async getReply(analyzed) {
        console.log(this._podcasts.length);
        switch (analyzed.answerType) {
        case 'play': {
            const ret = {
                messages: [
                    this._interp(this._("Play KQED now."), {}),
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
                ],
                expecting: TT.Type.String,
                context: analyzed.user_target,
                agent_target: '@org.kqed.reply'
            };
            if (++this._item >= this._podcasts.length)
                this._item = 0;
            return ret;
        }

        case 'continue': {
            this._askedResume = true;
            return {
                messages: [
                    this._interp(this._("resume playing?"), {})
                ],
                expecting: TT.Type.String,
                context: analyzed.user_target,
                agent_target: '@org.kqed.reply'
            };
        }

        case 'next': {
            const ret = {
                messages: [
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
                ],
                expecting: TT.Type.String,
                context: analyzed.user_target,
                agent_target: '@org.kqed.reply'
            };
            if (++this._item >= this._podcasts.length)
                this._item = 0;
            return ret;
        }

        case 'stop': {
            return {
                messages: [
                    this._interp(this._("Stop playing."), {})
                ],
                expecting: null,
                context: analyzed.user_target,
                agent_target: '@org.kqed.reply',
                program: "@org.thingpedia.weather.current(location=$?);"
            };
        }

        default:
            console.log(`Unexpected answer type`, analyzed);
            return {
                messages: [
                    this._("Sorry, I don't know this one.")
                ],
                expecting: null,
                context: analyzed.user_target,
                agent_target: '@org.kqed.reply_fail'
            };
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

class KqedDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'org.kqed';
        this.name = "KQED Now";
        this.description = "A daily News podcast from KQED";
        this._dialogueHandler = new KqedDialogueHandler(this.platform.locale, this.platform.timezone);
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
                return;
            } catch(e) {
                throw new Error(DEVICE_ERROR.service_unavailable);
            }
        }
    }
}
module.exports = KqedDevice;