// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Victor Kaiser-Pendergrast <vkpend@stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

// API key has rate limiting, total of 1,000 requests per day,
// so this could break with enough users...
const DEV_KEY = "RtEr25ZEEUiZfUSaikUfY7ExTVifAUj0cqePF5Jw";
const URL_ASTEROIDS = "https://api.nasa.gov/neo/rest/v1/feed?api_key=" + DEV_KEY;

// NASA's endpoint only updated daily
const INTERVAL = 3600 * 1000 * 24;

module.exports = new Tp.ChannelClass({
    Name: 'NasaNEOChannel',
    Extends: Tp.HttpPollingTrigger,
    RequiredCapabilities: ['channel-state'],

    _init: function(engine, state, device) {
        this.parent(engine, state, device);
        this.interval = INTERVAL;
        this.url = URL_ASTEROIDS;

        // use precise polling so we don't notify twice in the same day
        this.precise = true;
    },

    formatEvent(event) {
        var id = event[0];
        var name = event[1];
        var diameterMin = event[2];
        var diameterMax = event[3];
        var dangerous = event[4];
        var velocity = event[5];
        var closestDistanceToEarth = event[6];
        var orbitingBody = event[7];

        var formatted = [dangerous ? "Dangerous object near Earth today: %s".format(name) : "Nearest asteroid today: %s".format(name),
            "Diameter between %.1f m and %.1f m".format(diameterMin, diameterMax)];
        if (velocity !== 0) {
            formatted.push("Relative velocity %.2f km/s".format(velocity/1000));
            formatted.push("Closest distance to Earth %.0f km".format(closestDistanceToEarth/1000));
        }
        return formatted;
    },

    _onResponse(response) {
        var resultObj = JSON.parse(response);

        // Unlike AOPD's API, we don't have to worry about versioning
        // because it's specified in the endpoint URL.

        if (resultObj.element_count <= 0)
            return;

        // Need to get today's near earth objects, in form 2016-02-29
        var now = new Date;
        var todayString = "%04d-%02d-%02d".format(now.getFullYear(), now.getMonth() + 1, now.getDate());

        var todayObjects = resultObj.near_earth_objects[todayString];
        if (!todayObjects || todayObjects.length == 0) {
            console.log("No near earth objects today");
            return;
        }

        var nearestObject = todayObjects[0];

        // Integer ID
        var id = 0;
        if (nearestObject.neo_reference_id !== undefined) {
            id = nearestObject.neo_reference_id;
        }

        var name = nearestObject.name;

        // In meters
        var estimatedDiameterMin = nearestObject.estimated_diameter.meters.estimated_diameter_min;
        var estimatedDiameterMax = nearestObject.estimated_diameter.meters.estimated_diameter_max;

        var dangerous = nearestObject.is_potentially_hazardous_asteroid;

        var relativeVelocity = 0; // In meters/second
        var closestDistanceToEarth = 0; // In meters
        var orbitingBody = "Unknown"; // E.g. "Earth"
        if (nearestObject.close_approach_data.length > 0) {
            relativeVelocity = nearestObject.close_approach_data[0].relative_velocity.kilometers_per_second * 1000;
            closestDistanceToEarth = nearestObject.close_approach_data[0].miss_distance.kilometers * 1000;
            orbitingBody = nearestObject.close_approach_data[0].orbiting_body;
        }

        var event = [id, name, estimatedDiameterMin, estimatedDiameterMax, dangerous, relativeVelocity, closestDistanceToEarth, orbitingBody];
        this.emitEvent(event);
    }
});
