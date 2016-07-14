// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Vivek Jain <vsjain@stanford.edu>
//                James Hong <jamesh93@stanford.edu>
//                Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See COPYING for details

const Tp = require('thingpedia');

const languages = require('./languages.json');

module.exports = new Tp.ChannelClass({
    Name: 'YandexDetectLanguageChannel',

    _init: function(engine, device, params) {
        this.parent();
        this._device = device;
        this._apiKey = device.apiKey;
    },

    formatEvent(event) {
        var text = event[0];
        var lang = event[1];

        if (lang in languages)
            return "Detected as %s".format(languages[lang]);
        else
            return "Detected as %s".format(lang);
    },

    invokeQuery: function(filters) {
        var text = filters[0];

        var url = "https://translate.yandex.net/api/v1.5/tr.json/detect?key="
            + this._apiKey + "&text=" + encodeURIComponent(text);

        return Tp.Helpers.Http.get(url).then((response) => {
            console.log(response);
            var parsed = JSON.parse(response);
            if (parsed.code != 200)
                throw new Error('Failed to translate');

            return [[text, parsed.lang]];
        });
    },
});
