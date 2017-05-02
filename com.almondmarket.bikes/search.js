// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2017 Silei Xu <silei@cs.stanford.edu>
//
// See LICENSE for details

var Tp = require('thingpedia');
var TT = require('thingtalk');
var URL = 'https://colby.stanford.edu/main/api/bikes/';

module.exports = new Tp.ChannelClass({
    Name: 'SearchBikePosts',

    _init: function _init(engine, device) {
        this.parent();
        this._device = device;
        this.url = URL;
    },

    formatEvent: function formatEvent(event, filters) {
        return '%s %s %s bike for $%f, contact %s (%s) for details'.format(event[0], event[1], event[2], event[4], event[5], event[6]);
    },

    invokeQuery: function invokeQuery(filters, env) {
        var url = this.url;

        var answers = {};

        return env.askQuestion(TT.Type.Enum(['male', 'female']), "Do you want a female or a male bike?").then((gender) => {
            answers.gender = gender;
            return env.askQuestion(TT.Type.Enum(['cruise', 'road_bike']), "What kind of bike do you want?");
        }).then((kind) => {
            answers.kind = kind;
            if (kind === 'cruise')
                return env.askQuestion(TT.Type.Boolean, "Do you want one with a basket?").then((basket) => answers.basket = basket);
            else if (kind === 'road_bike')
                return env.askQuestion(TT.Type.Boolean, "Do you want one with a disk brake?").then((disk_brake) => answers.disk_brake = disk_brake);
        }).then(() => {
            return Tp.Helpers.Http.get(url);
        }).then((data) => {
            var response = JSON.parse(data);

            var posts = response.objects;
            return posts.filter((post) => {
                // apply all the filters here...
                return post.gender === answers.gender;
            }).map(function (post) {
                return [post.brand, post.model, post.gender, post.size, post.price, post.poster, post.phone];
            });
        });
    }
});
