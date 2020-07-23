// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2018 Google LLC
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

module.exports = [
    ['query', 'translate', { text: 'hello', target_language: 'es' },
     { translated_text: 'hola' }],

    ['query', 'translate', { text: 'hallo', source_language: 'de', target_language: 'en' },
     { translated_text: 'Hello' }],

    ['query', 'detect_language', { text: 'hola como estas?' },
     { value: new Tp.Value.Entity('es', 'Spanish') }],
];
