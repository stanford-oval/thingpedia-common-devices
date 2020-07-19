// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2019 Silei Xu <silei@cs.stanford.edu>
//
// See LICENSE for details
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
            categories: 'restaurants',
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
                    query.categories += ',' + value;
                } else if (pname === 'price' && op === '==') {
                    query.price = INVERSE_PRICE_RANGE_MAP[String(value)];
                }
            }
        }
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
                reviewCount: b.review_count,
                geo,
                phone: b.phone
            };
        });
    }
};
