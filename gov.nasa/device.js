// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Victor Kaiser-Pendergrast <vkpend@stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

module.exports = class NasaDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);

        this.uniqueId = 'gov.nasa';
        this.name = 'NASA Public Data';
        this.description = 'Get access to publicly available images and data from NASA';

        // API key has rate limiting, total of 1,000 requests per day,
        // so this could break if enough ThingEngine instances have this interface enabled
        this._apiKey = this.constructor.metadata.auth.api_key;
    }

    checkAvailable() {
        return Tp.Availability.AVAILABLE;
    }

    get_apod() {
        return Tp.Helpers.Http.get("https://api.nasa.gov/planetary/apod?api_key=" + this._apiKey).then((response) => {
            const resultObj = JSON.parse(response);

            // Only checking for image media, response version v1
            // (historically, all APOD results are media_type:image, v1)
            if (resultObj.media_type === "image" && resultObj.service_version === "v1") {
                const title = resultObj.title;
                const description = resultObj.explanation;
                let picture_url;

                // Use high definition image if available
                if (resultObj.hdurl !== 'undefined')
                    picture_url = resultObj.hdurl;
                else
                    picture_url = resultObj.url;

                return [{ title, description, picture_url }];
            } else {
                return [];
            }
        });
    }

    get_rover({ date_taken, count }) {
        let yesterday = new Date;
        yesterday.setHours(0,0,0);
        yesterday.setTime(yesterday.getTime() - (24 * 3600 * 1000));

        if (date_taken === null || date_taken === undefined) {
            date_taken = yesterday;
        } else {
            date_taken.setHours(0,0,0);
            // we don't get pictures for today, only up to yesterday
            if (yesterday.getTime() < date_taken.getTime())
                return [];
        }

        const sol0 = new Date('2012-08-06T00:00:00Z');
        const sol = Math.floor((date_taken.getTime() - sol0.getTime())/ 88775244.09);

        if (count === null || count === undefined)
            count = 1;

        const url = "https://api.nasa.gov/mars-photos/api/v1/rovers/curiosity/photos?sol=" + sol + "&api_key=" + this._apiKey;
        return Tp.Helpers.Http.get(url).then((response) => {
            const resultObj = JSON.parse(response);
            const photos = resultObj.photos;

            return photos.slice(0, count).map((photo) => {
                const picture_url = photo.img_src;
                const date_taken = new Date(photo.earth_date);
                const camera_used = new Tp.Value.Entity(photo.camera.name, photo.camera.full_name);
                return { date_taken, picture_url, camera_used };
            });
        });
    }

    get_asteroid() {
        const url = "https://api.nasa.gov/neo/rest/v1/feed?api_key=" + this._apiKey;

        return Tp.Helpers.Http.get(url).then((response) => {
            const resultObj = JSON.parse(response);

            // Unlike AOPD's API, we don't have to worry about versioning
            // because it's specified in the endpoint URL.

            if (resultObj.element_count <= 0)
                return [];

            // Need to get today's near earth objects, in form 2016-02-29
            const now = new Date;
            const todayString = "%04d-%02d-%02d".format(now.getFullYear(), now.getMonth() + 1, now.getDate());

            const todayObjects = resultObj.near_earth_objects[todayString];
            if (!todayObjects || todayObjects.length === 0) {
                console.log("No near earth objects today");
                return [];
            }

            const nearestObject = todayObjects[0];

            // Integer ID
            let asteroid_id = '0';
            if (nearestObject.neo_reference_id !== undefined)
                asteroid_id = String(nearestObject.neo_reference_id);

            const name = nearestObject.name;

            // In meters
            const estimated_diameter_min = nearestObject.estimated_diameter.meters.estimated_diameter_min;
            const estimated_diameter_max = nearestObject.estimated_diameter.meters.estimated_diameter_max;

            const is_dangerous = nearestObject.is_potentially_hazardous_asteroid;

            let relative_velocity = 0; // In meters/second
            let distance = 0; // In meters
            let orbiting_body = "Unknown"; // E.g. "Earth"
            if (nearestObject.close_approach_data.length > 0) {
                relative_velocity = nearestObject.close_approach_data[0].relative_velocity.kilometers_per_second * 1000;
                distance = nearestObject.close_approach_data[0].miss_distance.kilometers * 1000;
                orbiting_body = nearestObject.close_approach_data[0].orbiting_body;
            }

            return [{
                asteroid_id,
                name,
                estimated_diameter_min,
                estimated_diameter_max,
                is_dangerous,
                relative_velocity,
                distance,
                orbiting_body
            }];
        });
    }
};
