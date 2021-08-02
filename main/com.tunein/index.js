// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2021 The Board of Trustees of the Leland Stanford Junior University
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
//
// Author: Jake Wu <jmhw0123@gmail.com>
"use strict";

const Tp = require("thingpedia");
const querystring = require("querystring");

const BASE_URL = 'http://opml.radiotime.com/';
const RENDER_TYPE = 'json';
const QUERY_PARAM = {
    search: 'Search.ashx',
    browse: 'Browse.ashx',
    tune: 'Tune.ashx'
};
const CONTENT_KEYS = {
    station: 'station',
    stations: 'stations',
    audio: 'audio',
    fm: 'fm',
    am: 'am',
    internet: 'internet only'
};
const DEVICE_ERROR = {
    unsupported_version: 'unsupported_version',
    service_unavailable: 'service_unavailable',
    station_not_found: 'station_not_found'
};

module.exports = class TuneinRadioDevice extends Tp.BaseDevice {
    constructor(engine, state) {
         super(engine, state);
         this.query = {
            term: '',
            trending: 'trending',
            local: 'local'
        };
    }

    _format_station_output(stations) {
        return stations.map((item) => {
            const id = new Tp.Value.Entity(`station:${item.guide_id.toLowerCase()}`, item.text);
            return {
                id,
                show: item.subtext,
                link: item.URL,
                image: item.image
            };
        });
    }

    async _get_station_details(url) {
        const content = JSON.parse(await Tp.Helpers.Http.get(url)).body;
        let stations = [];
        if (typeof content !== 'undefined' && content.length > 0) {
            if (content.find((item) => item.text.toLowerCase() === CONTENT_KEYS.stations)) {
                stations = content.filter((item) => item.text.toLowerCase() === CONTENT_KEYS.stations)
                                  .flatMap(({children}) => children)
                                  .filter((channel) => (channel.type.toLowerCase() === CONTENT_KEYS.audio && channel.item.toLowerCase() === CONTENT_KEYS.station));
            } else if (content.find((item) => [CONTENT_KEYS.fm, CONTENT_KEYS.am, CONTENT_KEYS.internet].includes(item.text.toLowerCase()))) {
                stations = content.filter((item) => [CONTENT_KEYS.fm, CONTENT_KEYS.am, CONTENT_KEYS.internet].includes(item.text.toLowerCase()))
                                  .flatMap(({children}) => children)
                                  .filter((channel) => (channel.type.toLowerCase() === CONTENT_KEYS.audio && channel.item.toLowerCase() === CONTENT_KEYS.station));
            } else {
                stations = content.filter((channel) => (
                    'type' in channel &&
                    'item' in channel &&
                    channel.type.toLowerCase() === CONTENT_KEYS.audio && 
                    channel.item.toLowerCase() === CONTENT_KEYS.station
                ));
            }
            return this._format_station_output(stations);
        } else {
            throw new Error(DEVICE_ERROR.station_not_found);
        }
    }

    async get_station(params, hints) {
        if (hints && hints.filter) {
            for (const [pname, op, value] of hints.filter) {
                if (pname === 'id' && (op === '==' || op === '=~')) {
                    if (value instanceof Tp.Value.Entity)
                        this.query.term = value.display;
                    else
                        this.query.term = value;
                }
            }
        }
        const query_string = {
            query: this.query.term,
            render: RENDER_TYPE
        };
        const url = `${BASE_URL}${QUERY_PARAM.search}?${querystring.stringify(query_string)}`;
        return this._get_station_details(url);       
    }

    async get_most_popular_stations() {
        const query_string = {
            c: this.query.trending,
            render: RENDER_TYPE
        };
        const url = `${BASE_URL}${QUERY_PARAM.browse}?${querystring.stringify(query_string)}`;
        return this._get_station_details(url);       
    }

    async get_local_stations() {
        if (this.platform === 'cloud') {
            throw new Error(DEVICE_ERROR.unsupported_version);
        } else {
            const query_string = {
                c: this.query.local,
                render: RENDER_TYPE
            };
            const url = `${BASE_URL}${QUERY_PARAM.browse}?${querystring.stringify(query_string)}`;
            return this._get_station_details(url);
        }      
    }

    _test_mode() {
        return process.env.TEST_MODE === '1';
    }

    async do_radio_play({id}) {
        if (this._test_mode()) return;
        const audio_player = this.platform.getCapability('audio-player');
        if (!audio_player){
            throw new Error(DEVICE_ERROR.unsupported_version);
        } else {
            const query_string = {
                id: String(id).split(':')[1],
            };
            const url = `${BASE_URL}${QUERY_PARAM.tune}?${querystring.stringify(query_string)}`;
            // const playable_link = this._http_post(url);
            const playable_link = await Tp.Helpers.Http.get(url);
            try{
                audio_player.play(playable_link);
                return;
            } catch (e) {
                throw new Error(DEVICE_ERROR.service_unavailable);
            }
        }
    }  
};