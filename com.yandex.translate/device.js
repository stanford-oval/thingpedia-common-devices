// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Vivek Jain <vsjain@stanford.edu>
//                James Hong <jamesh93@stanford.edu>
//                Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

const API_KEY = 'trnsl.1.1.20160303T103221Z.a4b21d757023b0ee.8fcdf6451b8964e5a64e3bf9ca1a9797ba355924';

module.exports = new Tp.DeviceClass({
    Name: 'YandexTranslateDevice',

    _init: function(engine, state) {
        this.parent(engine, state);

        this.uniqueId = 'com.yandex.translate';
        this.name = "Yandex Translate";
        this.description = "Translate using Yandex.";
        this.apiKey = API_KEY;
    }
});
