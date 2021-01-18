// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Christopher Salvarani
//           2016-2020 The Board of Trustees of the Leland Stanford Junior University
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

const Tp = require('thingpedia');

module.exports = class XkcdDevice extends Tp.BaseDevice {
    _toComic(parsed) {
        return {
            id: parsed.num,
            title: parsed.title,
            alt_text: parsed.alt,
            picture_url: parsed.img,
            link: 'https://xkcd.com/' + parsed.num,
            release_date: new Date(parseInt(parsed.year, 10), parseInt(parsed.month, 10)-1, parseInt(parsed.day, 10), 0, 0, 0)
        };
    }

    async _loadNumber(number) {
        //console.log('_loadNumber', number);
        const result = await Tp.Helpers.Http.get('https://xkcd.com/' + number + '/info.0.json');
        return this._toComic(JSON.parse(result));
    }
    async _loadLatest() {
        const result = await Tp.Helpers.Http.get('https://xkcd.com/info.0.json');
        return this._toComic(JSON.parse(result));
    }

    async _searchByDate(date) {
        let min = await this._loadNumber(1);
        let max = await this._loadLatest();

        if (min.release_date >= date)
            return min;
        if (max.release_date <= date)
            return max;

        while (min.id < max.id-1) {
            const midNumber = Math.floor((min.id + max.id)/2);
            const mid = await this._loadNumber(midNumber);

            if (+mid.release_date === +date)
                return mid;
            if (mid.release_date < date)
                min = mid;
            else
                max = mid;
        }
        return min;
    }

    async get_comic(params, hints) {
        let start = undefined, count = 1, direction = 1;

        let dateFilter = undefined, numberFilter;
        for (const filter of hints.filter || []) {
            if (filter[0] === 'release_date')
                dateFilter = [filter[1], filter[2]];
            if (filter[0] === 'id')
                numberFilter = [filter[1], filter[2]];
        }
        if (numberFilter) {
            start = numberFilter[1];
            direction = numberFilter[0] === '<=' ? -1 : 1;
            count = numberFilter[0] === '==' ? 1 : 20;
        } else if (dateFilter) {
            start = (await this._searchByDate(dateFilter[1])).id;
            direction = dateFilter[0] === '<=' ? -1 : 1;
            count = 20;
        } else {
            if (!hints.sort) {
                count = hints.limit || 1;
            } else if (hints.sort[0] === 'id') {
                count = hints.limit || 1;
                direction = hints.sort[1] === 'asc' ? 1 : -1;
                start = hints.sort[1] === 'asc' ? 1 : undefined;
            } else if (hints.sort[0] === 'release_date') {
                count = hints.limit || 1;
                direction = hints.sort[1] === 'asc' ? 1 : -1;
                start = hints.sort[1] === 'asc' ? 1 : undefined;
            }
        }

        const latest = (await this._loadLatest()).id;
        if (start === undefined)
            start = latest;

        // FIXME this could be an async generator and we would shave off some unnecessary API calls
        const results = [];
        for (let i = 0; i < count; i++) {
            const number = start + i * direction;
            if (number < 1 || number > latest)
                continue;
            results.push(await this._loadNumber(number));
        }
        return results;
    }

    async get_random_comic() {
        const max = (await this._loadLatest()).id;
        return [await this._loadNumber(Math.floor(Math.random() * max))];
    }
};
