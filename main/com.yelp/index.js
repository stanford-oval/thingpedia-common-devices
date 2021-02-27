// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2019-2020 The Board of Trustees of the Leland Stanford Junior University
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
// Author: Silei Xu <silei@cs.stanford.edu>
"use strict";

const Tp = require('thingpedia');
const URL = "https://api.yelp.com/v3/businesses";

const CUISINES = new Set(require('./cuisines.json').data.map((d) => d.value));

function prettyprintAddress(address) {
    if (address.display_address)
        return address.display_address.join(', ');

    return [
        address.address1,
        address.address2,
        address.address3,
        address.city,
        address.country === 'US' ? address.state + ' ' + address.zip_code : address.country
    ].filter((i) => i.length > 0).join(', ');
}

const PRICE_RANGE_MAP = {
    $: 'cheap',
    $$: 'moderate',
    $$$: 'expensive',
    $$$$: 'luxury',
};
const INVERSE_PRICE_RANGE_MAP = {
    cheap: '1',
    moderate: '2',
    expensive: '3',
    luxury: '4'
};

module.exports = class YelpDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);

        this.name = "Yelp";
        this.description = "Yelp search for Almond ";
    }

    async get_restaurant(params, hints, env) {
        let sortBy = 'best_match';
        let limit = 50;
        // NOTE sort by is not strict, so we cannot use the limit hint
        if (hints && hints.sort) {
            if (hints.sort[0] === 'reviewCount' && hints.sort[1] === 'desc')
                sortBy = 'review_count';
            else if (hints.sort[0] === 'rating' && hints.sort[1] === 'desc')
                sortBy = 'rating';
        }

        let url = `${URL}/search?limit=${limit}&sort_by=${sortBy}&locale=${this.platform.locale.replace('-', '_')}`;

        const query = {
            term: '',
            location: undefined,
            categories: '',
            price: undefined,
        };
        const addedCategories = new Set;

        if (hints && hints.filter) {
            for (let [pname, op, value] of hints.filter) {
                if (pname === 'id' && (op === '==' || op === '=~')) {
                    if (value instanceof Tp.Value.Entity)
                        query.term += ' ' + value.display;
                    else
                        query.term += ' ' + value;
                } else if (pname === 'geo' && (op === '==' || op === '=~')) {
                    query.location = value;
                } else if (pname === 'cuisines' && op === 'contains') {
                    if (addedCategories.has(String(value)))
                        continue;
                    addedCategories.add(String(value));
                    if (query.categories)
                        query.categories += ',' + value;
                    else
                        query.categories = value;
                } else if (pname === 'price' && op === '==') {
                    query.price = INVERSE_PRICE_RANGE_MAP[String(value)];
                }
            }
        }
        if (!query.categories)
            query.categories = 'restaurants';
        if (!query.location) {
            const gps = this.platform.getCapability('gps');
            if (gps)
                query.location = await gps.getCurrentLocation();
            else
                query.location = { display: 'palo alto' };
        }
        if (query.location.lat && query.location.lat)
            url += `&latitude=${query.location.lat}&longitude=${query.location.lon}`;
        else
            url += `&location=${encodeURIComponent(query.location.display)}`;
        if (query.term)
            url += `&term=${encodeURIComponent(query.term.trim())}`;
        if (query.categories)
            url += `&categories=${query.categories}`;
        if (query.price)
            url += `&price=${query.price}`;
        /*if (params.radius)
            url += `&radius=${params.radius.value}`;
        */

        console.log(url);

        const response = await Tp.Helpers.Http.get(url, {
            auth: 'Bearer ' + this.constructor.metadata.auth.api_key
        });
        const parsed = JSON.parse(response);
        return parsed.businesses.filter((b) => !b.is_closed).map((b) => {
            const id = new Tp.Value.Entity(b.id, b.name);
            const cuisines = b.categories.filter((cat) => CUISINES.has(cat.alias))
                .map((cat) => new Tp.Value.Entity(cat.alias, cat.alias === 'creperies' ? "Crepes" : cat.title));

            const geo = new Tp.Value.Location(b.coordinates.latitude, b.coordinates.longitude,
                                              prettyprintAddress(b.location));

            return {
                id,
                image_url: b.image_url,
                link: b.url,
                cuisines,
                price: PRICE_RANGE_MAP[b.price] || b.price,
                rating: Number(b.rating),
                review_count: b.review_count,
                geo,
                phone: b.phone
            };
        });
    }
};
