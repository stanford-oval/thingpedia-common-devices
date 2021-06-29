'use strict';

const Tp = require('thingpedia');
const axios = require('axios');
const axiosExtensions = require('axios-extensions');
const url = require('url');

const BASE_URL = 'http://opml.radiotime.com';
const CONTENT_TYPE = 'application/x-www-form-urlencoded';

module.exports = class TuneinRadioDevice extends Tp.BaseDevice {
    constructor(engine, state) {
         super(engine, state);
         this.uniqueId = 'com.tunein';
         this.name = 'Tunein';
         this.description = 'Stream radio through TuneIn API';
    }

    
};