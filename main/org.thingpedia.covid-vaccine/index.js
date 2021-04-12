// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2021 Chaofei Fan <stfan@stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');
const MongoClient = require('mongodb');

const DB_URL = process.env.MONGODB_URL || "mongodb://localhost:27017";
const DB_NAME = "pharmacy_vaccines";
const COLLECTION_NAME = "appointments";

function prettyprintAddress(appointment) {
    return [
        appointment.properties.name,
        appointment.properties.address,
        appointment.properties.city,
        appointment.properties.state,
        appointment.properties.postal_code,
    ].filter((i) => i.length > 0).join(', ');
}

module.exports = class COVIDVaccineAPIDevice extends Tp.BaseDevice {

    async _mongodb_client() {
        console.log(`Connect to ${DB_URL}`);
        return new MongoClient(DB_URL, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
    }

    async get_appointment({ location, distance }) {
        if (distance === undefined || distance === null)
            distance = 10.0;
        console.log(location, distance);

        // TODO: Find a better way to mock.
        if (process.env.CI) {
            return [
                {
                    id: new Tp.Value.Entity("0", "Safeway"),
                    geo: new Tp.Value.Location(37, -122, "Safeway, Palo Alto"),
                    link: 'http://www.safeway.com'
                },
                {
                    id: new Tp.Value.Entity("1", "Walmart"),
                    geo: new Tp.Value.Location(37, -122, "Walmart, Palo Alto"),
                    link: 'http://www.walmart.com'
                }
            ]
        }

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
                        $maxDistance: distance * 1610,  // Mile to meter
                    },
                },
                "properties.appointments_available": true
            };

            const cursor = coll.find(query);
            let appointments = await cursor.toArray();
            appointments = appointments.map((appt) => {
                const id = new Tp.Value.Entity(appt._id.toString(), appt.properties.name);
                const geo = new Tp.Value.Location(
                    appt.geometry.coordinates[1],
                    appt.geometry.coordinates[0],
                    prettyprintAddress(appt));
                return {
                    id: id,
                    geo: geo,
                    link: appt.properties.url
                };
            });

            await cursor.close();
            console.log(appointments);
            return appointments;
        } catch (error) {
            console.error(error);
            throw new Error("Failed to get vaccine appointments");
        } finally {
            await client.close();
        }
    }
};
