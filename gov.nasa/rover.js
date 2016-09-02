// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Victor Kaiser-Pendergrast <vkpend@stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

// API key has rate limiting, total of 1,000 requests per day,
// so this could break with enough users...
const DEV_KEY = "RtEr25ZEEUiZfUSaikUfY7ExTVifAUj0cqePF5Jw";
const URL_ROVER = "https://api.nasa.gov/mars-photos/api/v1/rovers/curiosity/photos";

module.exports = new Tp.ChannelClass({
    Name: 'NasaCuriosityRoverChannel',

    _init: function(engine, device) {
        this.parent();
        this.auth = null;
    },

    formatEvent(event, filters) {
        var date = event[0];
        var count = event[1];
        var image = event[2];
        var camera = event[3];

        return [{ type: 'picture', url: image }];
    },

    invokeQuery(filters) {
        var yesterday = new Date;
        yesterday.setHours(0,0,0);
        yesterday.setTime(yesterday.getTime() - (24 * 3600 * 1000));

        var date = filters[0];
        if (date === null || date === undefined) {
            date = yesterday;
        } else {
            date.setHours(0,0,0);
            // we don't get pictures for today, only up to yesterday
            if (yesterday.getTime() < date.getTime())
                return [];
        }

        var sol0 = new Date('2012-08-06T00:00:00Z');
        var sol = Math.floor((date.getTime() - sol0.getTime())/ 88775244.09);
        console.log('sol', sol);

        var count = filters[1];
        if (count === null || count === undefined)
            count = 1;

        var url = URL_ROVER + "?sol=" + sol + "&api_key=" + DEV_KEY;
        return Tp.Helpers.Http.get(url).then((response) => {
            var resultObj = JSON.parse(response);
            var photos = resultObj.photos;

            var toEmit = [];
            for (var i = 0; i < Math.min(count, photos.length); i++)
                toEmit.push(photos[i]);

            return toEmit.map((photo) => {
                var image = photo.img_src;

                var dateTaken = new Date(photo.earth_date);
                var camera = photo.camera.full_name;
                return [dateTaken, count, image, camera];
            });
        });
    }
});
