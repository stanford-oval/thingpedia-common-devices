// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');
const FormData = require('form-data');

module.exports = class FacebokDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);

        this.uniqueId = 'com.facebook-' + this.profileId;
        this.name = "Facebook Account %s".format(this.userName);
        this.description = "This is your Facebook Account. You can use it to access your wall, follow your friends and more.";
    }

    get userName() {
        return this.state.userName || this.state.profileId;
    }

    get profileId() {
        return this.state.profileId;
    }

    do_post({status}) {
        throw new Error("Unfortunately, Facebook discontinues posting api starting from August 1st, 2018. We will reimplement this feature once there is an alternative way to do so");
        return Tp.Helpers.Http.post('https://graph.facebook.com/v2.12/me/feed', 'message=' + encodeURIComponent(status),
            {useOAuth2: this, dataContentType: 'application/x-www-form-urlencoded'});
    }

    do_post_picture({caption, picture_url}) {
        throw new Error("Unfortunately, Facebook discontinues posting api starting from August 1st, 2018. We will reimplement this feature once there is an alternative way to do so");

        const fbURL = 'https://graph.facebook.com/v2.12/me/photos';

        picture_url = String(picture_url);
        if (Tp.Helpers.Content.isPubliclyAccessible(picture_url)) {
            return Tp.Helpers.Http.post(fbURL, 'url=%s&caption=%s'.format(encodeURIComponent(picture_url), encodeURIComponent(caption)),
                {useOAuth2: this, dataContentType: 'application/x-www-form-urlencoded'});
        } else {
            return Tp.Helpers.Content.getStream(this.engine.platform, picture_url).then((stream) => {
                const formData = new FormData();
                formData.append('caption', caption);
                formData.append('source', stream, {contentType: stream.contentType});

                return Tp.Helpers.Http.postStream(fbURL, formData,
                    {useOAuth2: this, dataContentType: 'multipart/form-data; boundary=' + formData.getBoundary()});
            });
        }
    }

    get_list_posts() {
        const fields = 'id,created_time,full_picture,link,message,name,permalink_url,place,type';
        return Tp.Helpers.Http.get(`https://graph.facebook.com/v3.0/me/feed?fields=${fields}`,
            {useOAuth2: this, accept: 'application/json'}).then((response) => {
            const parsed = JSON.parse(response);
            return parsed.data.map((post) => {
                return {
                    id: post.id,
                    date: new Date(post.created_time),
                    message: post.message,
                    type: post.type,
                    picture_url: post.full_picture,
                    link: post.permalink_url,
                    link_title: post.name
                };
            });
        });
    }

    get_list_photos({ album }) {
        return Tp.Helpers.Http.get(`https://graph.facebook.com/v3.0/me/albums`,
            {useOAuth2: this, accept: 'application/json'}).then((response) => {
            const parsed = JSON.parse(response);
            if (!album)
                album = 'Timeline Photos';
            const picked = parsed.data.find((item) => item.name.toLowerCase() === album.toLowerCase());
            if (!picked)
                throw new Error(`No Album found with name ${album}`);
            return Tp.Helpers.Http.get(`https://graph.facebook.com/v3.0/${picked.id}/photos?fields=images`,
                {useOAuth2: this, accept: 'application/json'}).then((response) => {
                const parsed = JSON.parse(response);
                return parsed.data.map((item) => {
                    return {
                        id: item.id,
                        album: album,
                        date: item.created_time,
                        picture_url: item.images[0].source
                    } ;
                });
            });
        });
    }
};

module.exports.runOAuth2 = Tp.Helpers.OAuth2({
    kind: 'com.facebook',
    scope: ['email', 'public_profile', 'user_photos', 'user_posts'],
    authorize: 'https://www.facebook.com/v3.0/dialog/oauth',
    get_access_token: 'https://graph.facebook.com/oauth/access_token',

    // we need to force thingengine.stanford.edu as redirect uri
    // because we're half-lying to facebook and claiming we're a website instead
    // of a mobile app
    redirect_uri: 'https://thingengine.stanford.edu/devices/oauth2/callback/com.facebook',
    callback(engine, accessToken, refreshToken) {
        return Tp.Helpers.Http.get('https://graph.facebook.com/me',
                                   { auth: "Bearer " + accessToken, accept: 'application/json' }).then((response) => {
            const parsed = JSON.parse(response);
            return engine.devices.loadOneDevice({ kind: 'com.facebook',
                                                  accessToken: accessToken,
                                                  refreshToken: refreshToken,
                                                  userName: parsed.name,
                                                  profileId: parsed.id }, true);
        });
    }
});


let formattedOutput = (function(params, hint, formatter) {
    let formatted = [];
    if (params.type === 'status') {
        formatted.push({
            type: 'rdl',
            displayTitle: params.message ? params.message : 'Link',
            webCallback: params.link,
            callback: params.link,
        });
    } else if (params.type === 'photo') {
        if (params.message)
            {formatted.push({
                type: 'rdl',
                displayTitle: params.message,
                webCallback: params.link,
                callback: params.link,
            });}
        formatted.push({ type: 'picture', url: params.picture_url });
    } else if (params.type === 'link' || params.type === 'video') {
        if (params.message)
            {formatted.push({
                type: 'rdl',
                displayTitle: params.link_title ? params.link_title : 'Link',
                displayText: params.message,
                webCallback: params.link,
                callback: params.link,
            });}
        else
            {formatted.push({
                type: 'rdl',
                displayTitle: params.link_title ? params.link_title: 'Link',
                webCallback: params.link,
                callback: params.link,
            });}
    }
    formatted.push(`Posted on ${params.date}.`);
    return formatted;
});