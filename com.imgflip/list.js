// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

module.exports = new Tp.ChannelClass({
    Name: 'ImgflipListChannelDevice',

    formatEvent(event) {
        var name = event[0];
        var url = event[1];

        return [name, { type: 'picture', url: url }];
    },

    invokeQuery(filters) {
        return Tp.Helpers.Http.get('https://api.imgflip.com/get_memes').then((data) => {
            var parsed = JSON.parse(data);

            return parsed.data.memes.map((meme) => {
                return [meme.name, meme.url];
            });
        });
    },
});
