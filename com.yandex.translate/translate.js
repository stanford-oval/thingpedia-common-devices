// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Vivek Jain <vsjain@stanford.edu>
//                James Hong <jamesh93@stanford.edu>
//                Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

module.exports = new Tp.ChannelClass({
    Name: 'YandexTranslateChannel',

    _init: function(engine, device, params) {
        this.parent();
        this._device = device;
        this._apiKey = device.apiKey;
    },

    formatEvent(event) {
        var srcLang = event[0];
        var tgtLang = event[1];
        var text = event[2];
        var translated = event[3];

        return [translated];
    },

    invokeQuery(filters) {
        var srcLang = filters[0];
        if (srcLang === undefined || srcLang === null)
            srcLang = '';
        var tgtLang = filters[1];
        var text = filters[2];

        var langPair = tgtLang;
        if (srcLang)
            langPair = srcLang + '-' + tgtLang;

        var url = "https://translate.yandex.net/api/v1.5/tr.json/translate?key=" + this._apiKey +
            "&text=" + encodeURIComponent(text) + "&lang=" + langPair;

        return Tp.Helpers.Http.get(url).then((response) => {
            console.log(response);
            var parsed = JSON.parse(response);
            if (parsed.code != 200)
                throw new Error('Translation error: ' + response);

            return [[srcLang, tgtLang, text, parsed.text[0]]];
        });
    },
});
