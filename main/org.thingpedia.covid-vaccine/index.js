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
const SAMPLING_STRATEGY = 'probabilistic';
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

function indexOfMax(arr) {
    if (arr.length === 0)
        return -1;

    var max = arr[0];
    var maxIndex = 0;

    for (var i = 1; i < arr.length; i++) {
        if (arr[i] > max) {
            maxIndex = i;
            max = arr[i];
        }
    }

    return maxIndex;
}

function randomChoice(p) {
    let rnd = p.reduce( (a, b) => a + b ) * Math.random();
    return p.findIndex( (a) => (rnd -= a) < 0 );
}

function randomChoices(p, count) {
    return Array.from(Array(count), randomChoice.bind(null, p));
}

module.exports = class COVIDVaccineAPIDevice extends Tp.BaseDevice {

    async _mongodb_client() {
        console.log(`Connect to ${DB_URL}`);
        return new MongoClient(DB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    }

    async get_appointment({ zip_code, dose, vaccine_type }) {
        const distance = 10.0;
        console.log(zip_code, distance, dose, vaccine_type);

        // TODO: Find a better way to mock.
        if (process.env.CI)
            return MOCK_RESPONSE;

        const client = await this._mongodb_client();
        try {
            await client.connect();
            const db = client.db(DB_NAME);
            const provider_collection = db.collection(PROVIDER_COLLECTION);

            // Zip code to geo location
            const geocoder = NodeGeocoder({
                provider: 'google',
                apiKey: GOOGLE_API_KEY
            });
            const geocoder_res = await geocoder.geocode(zip_code);
            console.log(geocoder_res);

            // Get all providers within distance
            const query = {
                'geo.coordinates': {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: [geocoder_res[0].longitude,
                                          geocoder_res[0].latitude]
                        },
                        $maxDistance: distance * 1610,  // Mile to meter
                    },
                }
            };
            let cursor = provider_collection.find(query);
            const providers = await cursor.toArray();
            await cursor.close();

            // For each provider, find available appointments
            let appointments = providers.map(async (p) => {
                // Fetch the latest appointment
                const query = {
                    $query: {
                        'provider': p._id,
                        'available': true
                    },
                    $orderby: {
                        'fetched': -1
                    }
                };

                const appointment_collection = db.collection(APPOINTMENT_COLLECTION);
                let cursor = appointment_collection.find(query).limit(1);
                let appointment = (await cursor.toArray());
                await cursor.close();

                if (appointment.length === 0)
                    return null;
                appointment = appointment[0];

                // Filter by dose
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
            });

            // Filter appointments
            appointments = (await Promise.all(appointments)).filter((p) => {
                if (p === null)
                    return false;
                // If no user marked validity
                if (p.user_marked_validity === undefined)
                    return true;
                // If user marks it valid
                if (p.user_marked_validity !== undefined && p.user_marked_validity)
                    return true;
                return false;
            });
            console.log(appointments);

            let retval = [];
            if (appointments.length === 0)
                return [];


            // Sample one appointment based on availability rate.
            const availability_rates = appointments.map((appt) => appt.availability_rate);
            if (availability_rates.reduce((a, b) => a + b, 0) === 0) {
                // If all provider has 0 success_rate, return a random one.
                const random_idx = Math.floor(Math.random() * availability_rates.length);
                retval = [appointments[random_idx]];
            } else {
                // Sample one based on probability
                var sample_idx;
                if (SAMPLING_STRATEGY === 'most_likely')
                    sample_idx = indexOfMax(availability_rates);
                else
                    sample_idx = randomChoices(availability_rates, 1);
                retval = [appointments[sample_idx]];
            }

            console.log(retval);
            return retval;
        } catch (error) {
            console.error(error);
            throw new Error('Failed to get vaccine appointments');
        } finally {
            await client.close();
        }
    }

    async do_mark_valid({ appointment, validity }) {
        console.log(appointment, validity);

        if (process.env.CI)
            return;

        const client = await this._mongodb_client();
        try {
            await client.connect();
            const db = client.db(DB_NAME);
            const appointment_collection = db.collection(APPOINTMENT_COLLECTION);

            const query = { _id: appointment.value };
            const update = { $set: { user_marked_validity: validity } };
            const resp = await appointment_collection.updateOne(query, update);
            console.log(resp);
        } catch (error) {
            console.error(error);
            throw new Error('Failed to mark appointment');
        } finally {
            await client.close();
        }
    }
};
