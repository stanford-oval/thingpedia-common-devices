// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2021 Chaofei Fan <stfan@stanford.edu>
//
// See LICENSE for details
'use strict';

const Tp = require('thingpedia');
const MongoClient = require('mongodb');
const NodeGeocoder = require('node-geocoder');

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';
const DB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017';
const DB_NAME = 'vaccines';
const PROVIDER_COLLECTION = 'provider';
const APPOINTMENT_COLLECTION = 'appointment';
const MOCK_RESPONSE = [
    {
        id: new Tp.Value.Entity('0', 'Safeway'),
        geo: new Tp.Value.Location(37, -122, 'Safeway, Palo Alto'),
        link: 'http://www.safeway.com'
    },
    {
        id: new Tp.Value.Entity('1', 'Walmart'),
        geo: new Tp.Value.Location(37, -122, 'Walmart, Palo Alto'),
        link: 'http://www.walmart.com'
    }
];

function prettyprintAddress(appointment) {
    return [
        appointment.name,
        appointment.address,
        appointment.city,
        appointment.state,
        appointment.postal_code,
    ].filter((i) => i !== null && i.length > 0).join(', ');
}

async function connect_mongodb(uri) {
    console.log(`Connect to ${uri}`);
    const client = await (new MongoClient(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    }));
    await client.connect();
    return client;
}


module.exports = class COVIDVaccineAPIDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);

        // TODO: Find a better way to mock.
        if (!process.env.TEST_MODE)
            this._mongo_client = connect_mongodb(DB_URL);
        this._geo_cache = {};
    }

    async get_appointment({ zip_code, dose, vaccine_type }) {
        const distance = 100.0;
        console.log(zip_code, distance, dose, vaccine_type);

        // TODO: Find a better way to mock.
        if (process.env.TEST_MODE)
            return MOCK_RESPONSE;

        try {
            const client = await this._mongo_client;
            const db = client.db(DB_NAME);
            const provider_collection = db.collection(PROVIDER_COLLECTION);

            // Zip code to geo location
            console.time('geocoder');
            let geocoder_res = null;
            if (zip_code in this._geo_cache) {
                geocoder_res = this._geo_cache[zip_code];
            } else {
                const geocoder = NodeGeocoder({
                    provider: 'google',
                    apiKey: GOOGLE_API_KEY
                });
                geocoder_res = await geocoder.geocode(zip_code);
                console.log(geocoder_res);
                console.timeEnd('geocoder');
                if (geocoder_res.length === 0) {
                    const error = new Error();
                    error.code = 'invalid_zipcode';
                    throw error;
                }
                this._geo_cache[zip_code] = geocoder_res;
            }
            console.time('query provider');
            // Get all providers within distance
            let query = {
                'geo.coordinates': {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: [geocoder_res[0].longitude,
                                          geocoder_res[0].latitude]
                        },
                        $maxDistance: distance * 1610  // Mile to meter
                    },
                }
            };
            let cursor = provider_collection.find(query).limit(25);
            let providers = await cursor.toArray();
            console.timeEnd('query provider');
            await cursor.close();

            // Sort providers by zipcode.
            let providers_same_zip = [];
            let providers_diff_zip = [];
            for (const p of providers) {
                if (p.postal_code === zip_code)
                    providers_same_zip.push(p);
                else
                    providers_diff_zip.push(p);
            }
            providers = providers_same_zip.concat(providers_diff_zip);

            console.time('query appointments');
            const appointment_ids = providers.map((p) => `${p._id}:${p.appointments_last_fetched.getTime()}`);
            query = {
                '_id': {
                    $in: appointment_ids
                }
            };
            const appointment_collection = db.collection(APPOINTMENT_COLLECTION);
            cursor = appointment_collection.find(query);
            let appointments_all = (await cursor.toArray());
            await cursor.close();

            const appointments_map = {};
            for (const a of appointments_all)
                appointments_map[a.provider] = a;

            const appointments = providers.map((p, i) => {
                const appointment = appointments_map[p._id];

                if (appointment === undefined ||
                    appointment.available === undefined ||
                    appointment.available === false ||
                    (appointment.user_marked_validity !== undefined && !appointment.user_marked_validity))
                    return null;

                if (dose === 'second' && !appointment.second_dose_available)
                    return null;

                // Filter by vaccine type
                if (vaccine_type !== null && vaccine_type !== undefined) {
                    let found = false;
                    for (const vt of appointment.vaccine_types) {
                        if (vt === vaccine_type || vt === 'unknown') {
                            found = true;
                            break;
                        }
                    }
                    if (!found)
                        return null;
                }

                const id = new Tp.Value.Entity(appointment._id, p.name);
                const geo = new Tp.Value.Location(
                    p.geo.coordinates[1],
                    p.geo.coordinates[0],
                    prettyprintAddress(p));
                return {
                    id: id,
                    geo: geo,
                    link: p.url,
                    availability_rate: p.availability_rate || 0
                };
            }).filter((p) => p !== null);
            console.log(appointments);
            console.timeEnd('query appointments');

            let retval = [];
            if (appointments.length === 0)
                return [];

            retval = [appointments[0]];
            console.log(retval);
            return retval;
        } catch(error) {
            console.error(error);
            throw new Error('Failed to get vaccine appointments');
        }
    }

    async do_mark_valid({ appointment, validity }) {
        console.log(appointment, validity);

        if (process.env.TEST_MODE)
            return;

        try {
            const client = await this._mongo_client;
            const db = client.db(DB_NAME);

            const appointment_collection = db.collection(APPOINTMENT_COLLECTION);

            const query = { _id: appointment.value };
            const update = { $set: { user_marked_validity: validity } };
            const resp = await appointment_collection.updateOne(query, update);
            console.log(resp.modifiedCount);
        } catch(error) {
            console.error(error);
            throw new Error('Failed to mark appointment');
        }
    }
};
