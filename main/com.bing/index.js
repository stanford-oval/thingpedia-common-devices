// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016-2021 The Board of Trustees of the Leland Stanford Junior University
//
// Redistribution and use in source and binary forms, with or
// without modification, are permitted provided that the following
// conditions are met:
//
// 1. Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above
//    copyright notice, this list of conditions and the following
//    disclaimer in the documentation and/or other materials
//    provided with the distribution.
// 3. Neither the name of the copyright holder nor the names of its
//    contributors may be used to endorse or promote products derived
//    from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
// "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
// LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS
// FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
// COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT,
// INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
// (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
// SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
// HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
// STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
// ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED
// OF THE POSSIBILITY OF SUCH DAMAGE.
"use strict";

const interpolate = require('string-interp');
const Tp = require('thingpedia');
const TT = require('thingtalk');
const qs = require('querystring');

/**
 *
 * @param {string} x
 * @returns {string}
 */
function toCamelCase(x) {
    return x[0].toLowerCase() + x.substring(1);
}

class BingDialogueHandler {
    /**
     *
     * @param {string} locale
     * @param {string} timezone
     * @param {string} apiKey
     */
    constructor(locale, timezone, apiKey) {
        this._locale = locale;
        this._timezone = timezone;
        this._apiKey = apiKey;

        this._ = BingClass.gettext.gettext;

        this._lastQuerySuggestion = null;
    }

    _interp(string, args) {
        return interpolate(string, args, {
            locale: this._locale,
            timezone: this._timezone,
        });
    }

    get priority() {
        return Tp.DialogueHandler.Priority.FALLBACK;
    }
    get icon() {
        return 'com.bing';
    }

    getState() {
        return { lastQuerySuggestion: this._lastQuerySuggestion };
    }
    async initialize(initialState) {
        if (initialState)
            this._lastQuerySuggestion = initialState.lastQuerySuggestion;
        return null;
    }
    reset() {
        this._lastQuerySuggestion = null;
    }

    /**
     *
     * @param {string} command
     * @returns {Tp.DialogueHandler.CommandAnalysisResult}
     */
    async analyzeCommand(utterance) {
        let confident = Tp.DialogueHandler.Confidence.NONCONFIDENT_IN_DOMAIN_COMMAND;
        let query = utterance;

        const prefixregexp = new RegExp(this._("^ask bing (to|for)?\\b"));
        const prefixmatch = prefixregexp.exec(utterance);
        if (prefixmatch) {
            query = utterance.substring(prefixmatch[0].length).trim();
            confident = Tp.DialogueHandler.Confidence.CONFIDENT_IN_DOMAIN_COMMAND;
        }

        if (this._lastQuerySuggestion) {
            const yes = new RegExp(this._("^(yes|yeah|yep|sure)$"));
            const yesmatch = yes.exec(utterance);
            if (yesmatch) {
                query = this._lastQuerySuggestion;
                confident = Tp.DialogueHandler.Confidence.CONFIDENT_IN_DOMAIN_FOLLOWUP;
            }
        }

        const response = JSON.parse(await Tp.Helpers.Http.get(`https://api.cognitive.microsoft.com/bing/v7.0/search?` + qs.stringify({
            mkt: this._locale,
            setLang: this._locale,
            q: query,

            // limit to certain type of results from Bing
            responseFilter: 'computation,entities,spellSuggestions,translations'
        }), {
            extraHeaders: { 'Ocp-Apim-Subscription-Key': this._apiKey }
        }));
        //console.log(response);

        if (!response.rankingResponse)
            return { confident: Tp.DialogueHandler.Confidence.OUT_OF_DOMAIN_COMMAND, utterance, user_target: '' };

        if (confident === Tp.DialogueHandler.Confidence.NONCONFIDENT_IN_DOMAIN_COMMAND &&
            response.rankingResponse.pole)
            confident = Tp.DialogueHandler.Confidence.CONFIDENT_IN_DOMAIN_COMMAND;

        // choose computation over other types of results, regardless of what bing returns (bing ranking is terrible)
        if (response.computation) {
            return {
                confident,
                utterance,
                user_target: `@com.bing.computation;`,

                query: response.queryContext,
                answerType: 'computation',
                response: response.computation
            };
        }
        const bestRankingItem = response.rankingResponse.pole ?
            response.rankingResponse.pole.items[0] :
            response.rankingResponse.sidebar ?
            response.rankingResponse.sidebar.items[0] :
            response.rankingResponse.mainline ?
            response.rankingResponse.mainline.items[0] :
            undefined;
        if (!bestRankingItem)
            return { confident: Tp.DialogueHandler.Confidence.OUT_OF_DOMAIN_COMMAND, utterance, user_target: '' };
        const answerType = toCamelCase(bestRankingItem.answerType);
        const bestResponse = response[answerType];
        if (!bestResponse)
            return { confident: Tp.DialogueHandler.Confidence.OUT_OF_DOMAIN_COMMAND, utterance, user_target: '' };

        return {
            confident,
            utterance,
            user_target: `@com.bing.${answerType};`,

            query: response.queryContext,
            answerType: answerType,
            response: bestResponse
        };
    }

    /**
     *
     * @param {Tp.DialogueHandler.CommandAnalysisResult} analysis
     * @returns {Tp.DialogueHandler.ReplyResult}
     */
    getReply(analysis) {
        //console.log(analysis);
        switch (analysis.answerType) {
        case 'computation':
            return {
                messages: [this._interp(this._("According to Bing, ${expression} is equal to ${value}."), {
                    expression: analysis.response.expression,
                    value: analysis.response.value
                })],
                expecting: null,
                context: analysis.user_target,
                agent_target: '@com.bing.reply;'
            };

        case 'entities': {
            const entity = analysis.response.value[0];
            return {
                messages: [
                    this._interp(this._("According to Bing, the answer is ${name}. ${description}."), {
                        name: entity.name,
                        description: entity.description
                    }),
                    {
                        type: 'rdl',
                        webCallback: entity.webSearchUrl,
                        displayTitle: entity.name,
                        pictureUrl: entity.image.thumbnailUrl,
                    }
                ],
                expecting: null,
                context: analysis.user_target,
                agent_target: '@com.bing.reply;'
            };
        }

        case 'spellSuggestions': {
            const rewrite = analysis.response.query[0];
            this._lastQuerySuggestion = rewrite.text;
            return {
                messages: [
                    this._interp(this._("Did you mean ${rewrite}?"), {
                        rewrite: rewrite.displayText,
                    })
                ],
                expecting: TT.Type.Boolean,
                context: analysis.user_target,
                agent_target: '@com.bing.propose_spell_suggestion;'
            };
        }

        case 'translations': {
            return {
                messages: [
                    this._interp(this._("According to Bing, the translation is “${translation}”. Data from ${attribution}."), {
                        translation: analysis.response.translatedText,
                        attribution: analysis.response.attribution.map((a) => a.providerDisplayName)
                    }),
                ],
                expecting: null,
                context: analysis.user_target,
                agent_target: '@com.bing.reply;'
            };
        }
        default:
            throw new Error(`Unexpected bing answer type`);
        }
    }
}

class BingClass extends Tp.BaseDevice {
    /**
     *
     * @param {Tp.BaseEngine} engine
     * @param {Tp.BaseDevice.DeviceState} state
     */
    constructor(engine, state) {
        super(engine, state);
        this._dialogueHandler = new BingDialogueHandler(this.platform.locale, this.platform.timezone, this.constructor.metadata.auth.api_key);
    }

    /**
     *
     * @param {string} iface
     */
    queryInterface(iface) {
        switch (iface) {
        case 'dialogue-handler':
            return this._dialogueHandler;

        default:
            return super.queryInterface(iface);
        }
    }

    get_web_search({ query }, hints) {
        const locale = this.platform.locale;
        const count = hints.limit && !hints.sort ? hints.limit : 5;

        const url = `https://api.cognitive.microsoft.com/bing/v7.0/search?count=${count}&mkt=${locale}&setLang=${locale}&q=${encodeURIComponent(query)}&responseFilter=Webpages`;
        return Tp.Helpers.Http.get(url, {
            extraHeaders: { 'Ocp-Apim-Subscription-Key': this.constructor.metadata.auth.api_key }
        }).then((response) => {
            let parsedResponse = JSON.parse(response);
            return parsedResponse.webPages.value.map((result) => {
                return ({
                    query: query,
                    title: result.name,
                    description: result.snippet,
                    link: result.url,
                });
            });
        });
    }

    get_image_search({ query }, hints) {
        const locale = this.platform.locale;
        const count = hints.limit && !hints.sort ? hints.limit : 5;

        let url = `https://api.cognitive.microsoft.com/bing/v7.0/images/search?count=${count}&mkt=${locale}&setLang=${locale}&q=${encodeURIComponent(query)}`;

        for (const filter of hints.filter || []) {
            if (filter[0] === 'width') {
                if (filter[1] === '==')
                    url += `&width=${filter[2]}`;
                else if (filter[1] === '>=')
                    url += `&minWidth=${filter[2]}`;
                else if (filter[1] === '<=')
                    url += `&maxWidth=${filter[2]}`;
            } else if (filter[0] === 'height') {
                if (filter[1] === '==')
                    url += `&height=${filter[2]}`;
                else if (filter[1] === '>=')
                    url += `&minHeight=${filter[2]}`;
                else if (filter[1] === '<=')
                    url += `&maxHeight=${filter[2]}`;
            }
        }
        return Tp.Helpers.Http.get(url, {
            extraHeaders: { 'Ocp-Apim-Subscription-Key': this.constructor.metadata.auth.api_key }
        }).then((response) => {
            let parsedResponse = JSON.parse(response);
            return parsedResponse.value.map((result) => {
                return ({
                    query: query,
                    title: result.name,
                    picture_url: result.contentUrl,
                    link: result.hostPageUrl,
                    width: result.width,
                    height: result.height
                });
            });
        });

    }
}
module.exports = BingClass;
