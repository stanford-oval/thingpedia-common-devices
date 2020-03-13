"use strict";

const Tp = require('thingpedia');
var querystring = require('querystring');

module.exports = class MastodonClass extends Tp.BaseDevice {
    static get runOAuth2() {
        return Tp.Helpers.OAuth2({
            kind: 'social.mastodon',
            client_id: 'gaDS1ph46DhcDp7wb9u4bubCqTsv2qgYCyzQcuyoiNY',
            client_secret: '3LzsvKt1vDwUTwuTxUds6NsexDyS-1Seth1tFrVG9i8',
            scope: ['read', 'write', 'follow'],
            authorize: 'https://mastodon.social/oauth/authorize/',
            get_access_token: 'https://mastodon.social/oauth/token',
            callback: function(engine, accessToken, refreshToken) {

                var auth = 'Bearer ' + accessToken;
                return Tp.Helpers.Http.get(
                    'https://mastodon.social/api/v1/accounts/verify_credentials', {
                        auth: auth,
                        accept: 'application/json'
                    }).then((response) => {
                    var parsed = JSON.parse(response);
                    return engine.devices.loadOneDevice({
                        kind: 'social.mastodon',
                        accessToken: accessToken,
                        refreshToken: refreshToken,
                        userId: parsed.id,
                        userName: parsed.username
                    }, true);
                });
            }
        });
    }

    constructor(engine, state) {
        super(engine, state);

        this.uniqueId = 'mastodon.social-' + this.userId;
        this.name = 'Mastodon Account ' + this.userName;
        this.description = 'This is the Mastodon Account owned by ' + this.userName;
    }

    get userId() {
        return this.state.userId;
    }

    get userName() {
        return this.state.userName;
    }

    _removeHtml(text) {

        text = text.replace(/<style([\s\S]*?)<\/style>/gi, '');
        text = text.replace(/<script([\s\S]*?)<\/script>/gi, '');
        text = text.replace(/<\/div>/ig, '\n');
        text = text.replace(/<\/li>/ig, '\n');
        text = text.replace(/<li>/ig, '  *  ');
        text = text.replace(/<\/ul>/ig, '\n');
        text = text.replace(/<\/p>/ig, '\n');
        text = text.replace(/<br\s*[\/]?>/gi, "\n");
        text = text.replace(/<[^>]+>/ig, '');

        return text;
    }

    get_favorites(count) {

        count = count.count || 5;
        const url = 'https://mastodon.social/api/v1/favourites?limit=5';

        return Tp.Helpers.Http.get(url, { useOAuth2: this }).then((response) => {
            const parsed = JSON.parse(response);
            return parsed.map((post) => {

                var caption = this._removeHtml(post.content);

                return {
                    caption,
                    author: post.account.username,
                    url: post.media_attachments[0] ? post.media_attachments[0].url : null
                };
            });

        });
    }

    get_home_timeline(count) {

        count = count.count || 5;
        const url = `https://mastodon.social/api/v1/timelines/home?limit=${count}`;

        return Tp.Helpers.Http.get(url, { useOAuth2: this }).then((response) => {
            const parsed = JSON.parse(response);
            return parsed.map((post) => {

                var caption = this._removeHtml(post.content);

                return {
                    caption,
                    author: post.account.username,
                    url: post.reblog ? (post.reblog.media_attachments[0] ? post.reblog
                        .media_attachments[0].url : null) : null
                };
            });
        });
    }

    get_search(query, count) {

        count = count.count || 5;
        query = query.query;

        const url = `https://mastodon.social/api/v2/search?q=${query}&limit=${count}`;

        return Tp.Helpers.Http.get(url, { useOAuth2: this }).then((response) => {
            const parsed = JSON.parse(response);
            return parsed.accounts.map((post) => {

                var note = this._removeHtml(post.note);

                return {
                    note,
                    author: post.username,
                    url: post.avatar
                };
            });
        });

    }

    do_post(status) {

        status = status.status;
        const url = 'https://mastodon.social/api/v1/statuses';
        var postData = querystring.stringify({
            "status": status
        });

        return Tp.Helpers.Http.post(url, postData, {
            useOAuth2: this,
            dataContentType: 'application/x-www-form-urlencoded'
        });
    }

};