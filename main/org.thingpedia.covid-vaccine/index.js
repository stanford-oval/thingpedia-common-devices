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

                const id = new Tp.Value.Entity(p._id, p.name);
                const geo = new Tp.Value.Location(
                    p.geo.coordinates[1],
                    p.geo.coordinates[0],
                    prettyprintAddress(p));
                return {
                    id: id,
                    geo: geo,
                    link: p.url
                };
            });

            appointments = (await Promise.all(appointments)).filter((p) => p !== null);
            console.log(appointments);
            return appointments;
        } catch (error) {
            console.error(error);
            throw new Error('Failed to get vaccine appointments');
        } finally {
            await client.close();
        }
    }
};
