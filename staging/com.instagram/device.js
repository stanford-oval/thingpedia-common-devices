// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Sunkyu Lim <limsk1@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

module.exports = class InstagramClass extends Tp.BaseDevice {
    static get runOAuth2() {
        return Tp.Helpers.OAuth2({
            kind: 'com.instagram',
            client_id: 'fbd0f2d229ff4db38e58c2c3a193a710',
            client_secret: '4q41qr80n1544q2po63q91461p7r2226',
            scope: ['basic'],
            authorize: 'https://api.instagram.com/oauth/authorize/',
            get_access_token: 'https://api.instagram.com/oauth/access_token',
            callback(engine, accessToken, refreshToken) {
                return Tp.Helpers.Http.get('https://api.instagram.com/v1/users/self/?access_token=' + accessToken, {
                    accept: 'application/json'
                }).then((response) => {
                    const parsed = JSON.parse(response);
                    return engine.devices.loadOneDevice({
                        kind: 'com.instagram',
                        accessToken: accessToken,
                        userId: parsed.data.id,
                        userName: parsed.data.username,
                        fullName: parsed.data.full_name
                    }, true);
                });
            }
        });
    }

    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'com.instagram-' + this.userId;
        this.name = 'Instagram %s'.format(this.userName);
        this.description = "This is an Instagram account owned by %s".format(this.fullName);
    }

    get userId() {
        return this.state.userId;
    }

    get userName() {
        return this.state.userName;
    }

    get fullName() {
        return this.state.fullName;
    }

    get accessToken() {
        return this.state.accessToken;
    }

    get_get_pictures({count}) {
        if (count === undefined || count === null)
            count = 3;
        const url = "https://api.instagram.com/v1/users/self/media/recent/?access_token=%s&count=%d".format(this.accessToken, count);
        return Tp.Helpers.Http.get(url).then((response) => {
            const parsedResponse = JSON.parse(response);
            return parsedResponse.data.map((obj) => {
                return ({
                    count: count,
                    media_id: obj.id,
                    picture_url: obj.images.standard_resolution.url,
                    caption: obj.caption ? obj.caption.text : '',
                    link: obj.link,
                    filter: (obj.filter || '').toLowerCase(),
                    hashtags: obj.tags,
                    location: obj.location? { x: obj.location.longitude, y: obj.location.latitude } : { x: 0, y: 0 }
                });
            });
        });
    }

};
