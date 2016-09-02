// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Victor Kaiser-Pendergrast <vkpend@stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

// API key has rate limiting, total of 1,000 requests per day,
// so this could break if enough ThingEngine instances have this interface enabled
const DEV_KEY = "RtEr25ZEEUiZfUSaikUfY7ExTVifAUj0cqePF5Jw";
const URL_APOD = "https://api.nasa.gov/planetary/apod?api_key=" + DEV_KEY;

// 24 Hours
const INTERVAL = 3600 * 1000 * 24;

module.exports = new Tp.ChannelClass({
    Name: 'NasaAPODChannel',

    _init(engine, device) {
        this.parent(engine, device);
        this.auth = null;
        this.url = URL_APOD;
    },

    formatEvent(event, filters) {
        var title = event[0];
        var description = event[1];
        var image = event[2];

        return [title, description, { type: 'picture', url: image }];
    },

    invokeQuery(filters) {
        return Tp.Helpers.Http.get(this.url).then((response) => {
            var resultObj = JSON.parse(response);

            // Only checking for image media, response version v1
            // (historically, all APOD results are media_type:image, v1)
            if (resultObj.media_type === "image" && resultObj.service_version === "v1") {
                var title = resultObj.title;
                var description = resultObj.explanation;
                var image;

                // Use high definition image if available
                if (resultObj.hdurl !== 'undefined') {
                    image = resultObj.hdurl;
                } else {
                    image = resultObj.url;
                }

                var event = [title, description, image];
                return [event];
            } else {
                return [];
            }
        });
    }
});
