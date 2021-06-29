'use strict';

const Tp = require('thingpedia');
const axios = require('axios');
const axiosExtensions = require('axios-extensions');
const url = require('url');

const BASE_URL = 'http://opml.radiotime.com';
const CONTENT_TYPE = 'application/x-www-form-urlencoded';
const HTTP_STATUS_OK = 200;
const SEARCH_PARAM = '/Search.ashx';
const BROWSE_PARAM = '/Browse.ashx';
const BROWSE_ITEMS = ['trending', 'music', 'sports', 'talk'];

module.exports = class TuneinRadioDevice extends Tp.BaseDevice {
    constructor(engine, state) {
         super(engine, state);
         this.uniqueId = 'com.tunein';
         this.name = 'Tunein';
         this.description = 'Stream radio through TuneIn API';
    }

    _get_tunein_response(req) {
        return new Promise( (resolve, reject) => {
            axios.get(req.url, req)
                .then(response => { 
                    if (response.data.head.status == HTTP_STATUS_OK) {
                        let content = response.data.body;
                        if ('c' in req.params && BROWSE_ITEMS.includes(req.params.c.toLowerCase())) {
                            return resolve(content);
                        } else if (content.find(item => item.text.toLowerCase() == 'stations')) {
                            return resolve(
                                content.filter(item => item.text.toLowerCase() == 'stations')
                                       .flatMap(({children}) => children)
                                       .filter(channel => (channel.type.toLowerCase() == 'audio' && channel.item.toLowerCase() == 'station'))
                            );
                        } else {
                            return resolve(content.filter(channel => (channel.type.toLowerCase() == 'audio' && channel.item.toLowerCase() == 'station')));
                        }; 
                    } else {
                        reject(response.data);
                        return new Error(`HTTP request error: ${response.data.head.fault}`);
                    }
                })
                .catch(err => throwError("streaming_service_unaccessible"));
        }).catch(err => throwError("streaming_service_unaccessible"));
    }

    _get_channel_info(ch_list) {
        return ch_list.map(
            (x) => (({text, subtext='', current_track='', now_playing_id='', URL='', formats='', image=''}) => ({text, subtext, current_track, now_playing_id, URL, formats, image}))(x)
            );
    }

    async get_search_channel({query, count = 0}) {
        let req = {};
        req.params = {};
        req.url = SEARCH_PARAM;
        req.params.query = query;
        const available_channels = await this._get_tunein_response(req);
        if ([undefined, null, 0].includes(count))
            return this._get_channel_info(available_channels);
        else
            return this._get_channel_info(available_channels.slice(0,count));
    }

    async get_list_local_channels({count=0}) {
        let req = {};
        req.params = {};
        req.url = BROWSE_PARAM;
        req.params.c = 'local';
        const available_channels = await this._get_tunein_response(req);
        if ([undefined, null, 0].includes(count))
            return this._get_channel_info(available_channels);
        else
            return this._get_channel_info(available_channels.slice(0,count));
    }

    async get_list_trending_channels({count = 0}) {
        let req = {};
        req.params = {};
        req.url = BROWSE_PARAM;
        req.params.c = 'trending';
        const available_channels = await this._get_tunein_response(req);
        if ([undefined, null, 0].includes(count))
            return this._get_channel_info(available_channels);
        else
            return this._get_channel_info(available_channels.slice(0,count));
    }

    async do_play({query}) {
        let req = {};
        req.params = {};
        req.url = SEARCH_PARAM;
        req.params.query = query;
        const available_channels = await this._get_tunein_response(req);
        return available_channels[0].URL;
    }
};