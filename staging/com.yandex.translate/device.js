// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Vivek Jain <vsjain@stanford.edu>
//                James Hong <jamesh93@stanford.edu>
//           2016-2018 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

const languages = require('./languages.json');

module.exports = class YandexTranslateDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);

        this.uniqueId = 'com.yandex.translate';
        this.name = "Yandex Translate";
        this.description = "Translate using Yandex.";
        this._apiKey = this.constructor.metadata.auth.api_key;
    }

    get_translate({ source_language, target_language, text }) {
        if (source_language === undefined || source_language === null)
            source_language = '';
        else
            source_language = String(source_language);
        target_language = String(target_language);

        const langPair = source_language ? (source_language + '-' + target_language) : target_language;
        const url = "https://translate.yandex.net/api/v1.5/tr.json/translate?key=" + this._apiKey +
            "&text=" + encodeURIComponent(text) + "&lang=" + langPair;

        return Tp.Helpers.Http.get(url).then((response) => {
            const parsed = JSON.parse(response);
            if (parsed.code !== 200)
                throw new Error('Translation error: ' + response);

            return [{ translated_text: parsed.text[0] }];
        });
    }

    get_detect_language({ text }) {
        const url = "https://translate.yandex.net/api/v1.5/tr.json/detect?key="
            + this._apiKey + "&text=" + encodeURIComponent(text);

        return Tp.Helpers.Http.get(url).then((response) => {
            console.log(response);
            const parsed = JSON.parse(response);
            if (parsed.code !== 200)
                throw new Error('Failed to detect language');

            return [{ value: new Tp.Value.Entity(parsed.lang, languages[parsed.lang]) }];
        });
    }
};