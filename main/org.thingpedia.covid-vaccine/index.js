// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//                Silei Xu <silei@cs.stanford.edu>
//                Andrei Bajenov <abajenov@stanford.edu>
//                Darshan Kapashi <darshank@stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');
const MongoClient = require('mongodb');

const DB_URL = "mongodb://localhost:27017";
const DB_NAME = "pharmacy_vaccines";
const COLLECTION_NAME = "appointments";

module.exports = class COVIDVaccineAPIDevice extends Tp.BaseDevice {

    async _mongodb_client() {
        return new MongoClient(DB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    }

    async get_appointment({ location, date, distance }) {
        if (date == undefined || date == null)
            date = new Date();
        if (distance == undefined || distance == null)
            distance = 10.0;
        console.log(location, date, distance);

        const client = await this._mongodb_client();
        try {
            await client.connect();
            const db = client.db(DB_NAME);
            const coll = db.collection(COLLECTION_NAME);

            const query = {
                "geometry.coordinates": {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: [location.x, location.y]
                        },
                        $maxDistance: distance * 1610,
                    },
                },
                "properties.appointments_available": true
            };

            const cursor = coll.find(query);
            let appointments = await cursor.toArray();
            appointments = appointments.map((appt) => {
                return {
                    name: appt.properties.name,
                    address: appt.properties.address,
                    city: appt.properties.city,
                    state: appt.properties.state,
                    postal_code: appt.properties.postal_code,
                    url: appt.properties.url
                };
            });

            await cursor.close();
            console.log(appointments);
            return appointments;
        } catch (error) {
            console.log(error);
            return [];
        } finally {
            await client.close();
        }
    }
};
