// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Luke Hsiao & Jeff Setter
"use strict";

const Tp = require('thingpedia');

module.exports = class InstagramClass extends Tp.BaseDevice {
    static get runOAuth2() {
        return Tp.Helpers.OAuth2({
            kind: 'com.slack',
            scope: ['chat:write:user', 'chat:write:bot', 'files:write:user',
                'channels:read', 'channels:history', 'users:read', 'users:write',
                'channels:write'
            ],
            authorize: 'https://slack.com/oauth/authorize',
            get_access_token: 'https://slack.com/api/oauth.access',
            callback: function (engine, accessToken, refreshToken) {
                return Tp.Helpers.Http.post('https://slack.com/api/auth.test', 'token=' + accessToken,
                    {dataContentType: 'application/x-www-form-urlencoded'})
                    .then((response) => {
                        let parsed = JSON.parse(response);

                        return engine.devices.loadOneDevice({
                            kind: 'com.slack',
                            accessToken: accessToken,
                            refreshToken: refreshToken,
                            team: parsed.team,
                            user: parsed.user,
                            user_id: parsed.user_id,
                            url: parsed.url,
                            team_id: parsed.team_id
                        }, true);
                    });
            }
        });
    }

    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'com.slack-' + this.state.user_id;
        this.name = "Slack %s".format(this.state.user_id);
        this.description = "This is Slack owned by %s"
            .format(this.state.user);

        this._cachedUserIds = new Map;
    }

    get userId() {
        return this.state.user_id;
    }

    get userName() {
        return this.state.user;
    }

    get accessToken() {
        return this.state.accessToken;
    }

    async get_user_presence({ username }) {
        const userId = this._findUser(username);

        const response = JSON.parse(await Tp.Helpers.Http.post('https://slack.com/api/users.getPresence',
            'token=' + this.accessToken
            + '&user=' + encodeURIComponent(userId), {
                dataContentType: 'application/x-www-form-urlencoded'
            }));

        if (!response.ok) {
            console.log('[ERROR] invalid response from http POST (users.getPresence)', response);
            throw new Error("Users.GetPresence returned status of NOT OK.");
        }

        return { presence: response.presence };
    }

    async _findUser(username) {
        if (this._cachedUserIds.has(username))
            return this._cachedUserIds.get(username);

        const response = JSON.parse(await Tp.Helpers.Http.post('https://slack.com/api/users.list',
            'token=' + this.accessToken, {
                dataContentType: 'application/x-www-form-urlencoded'
            }));

        if (!response.ok) {
            console.log('[ERROR] invalid response from http POST (users.list)', response);
            throw new Error("Users.List returned status of NOT OK.");
        }

        for (let u of response.members) {
            if (u.name)
                this._cachedUserIds.set(u.name, u.id);
            else if (u.profile && u.profile.display_name)
                this._cachedUserIds.set(u.profile.display_name, u.id);
        }

        if (!this._cachedUserIds.has(username))
            throw new Error(`Invalid user ${username}`);
        return this._cachedUserIds.sget(username);
    }

    async get_channel_history({channel, date, sender, message}) {
        let token = this.accessToken;
        const response = Tp.Helpers.Http.post('https://slack.com/api/channels.list',
            'token=' + token +
            '&exclude_archived=' + encodeURIComponent(1), {
                dataContentType: 'application/x-www-form-urlencoded'
        });
        let parsed = JSON.parse(response);
        if (!parsed.ok) {
            console.log('[ERROR] invalid response from http POST for channel list');
            return [];
        }
        const messageLists = await Promise.all(parsed.channels.map(async (channel) => {
            // Check the 5 latest messages
            const response = await Tp.Helpers.Http.post('https://slack.com/api/channels.history',
                'token=' + token +
                '&channel=' + encodeURIComponent(channel.id) +
                '&count=' + encodeURIComponent('5'), {
                    dataContentType: 'application/x-www-form-urlencoded'
                }
            );
            let parsed = JSON.parse(response);
            if (!parsed.ok) {
                console.log('[ERROR] invalid response from http POST (channel.history)');
                throw new Error("Channels.History returned status of NOT OK.");
            }
            return Promise.all(parsed.messages.map(async (msg) => {
                const username = await this.get_username(msg.user);
                return {
                    channel: channel.name,
                    sender: username,
                    date: msg.ts,
                    message: msg.text
                };
            }));
        }));

        const flatlist = [];
        for (let list of messageLists)
            flatlist.push(...list);
        return flatlist;
    }

    do_send({channel, message}) {
        return this.get_channel_id(channel).then((channel_id) => {
            if (channel_id === null)
                throw new Error("Channel not found!");
            return Tp.Helpers.Http.post('https://slack.com/api/chat.postMessage',
                'token=' + this.accessToken +
                '&as_user=true' +
                '&channel=' + encodeURIComponent(channel_id) +
                '&text=' + encodeURIComponent(message), {
                    dataContentType: 'application/x-www-form-urlencoded'
            }).then((response) => {
                console.log('[info] Got a valid response to our POST?');
                console.log('[info] Response: ', String(response));
                let parsed = JSON.parse(response);
                if (!parsed.ok) 
                    console.log('[ERROR] invalid response from http POST');
                
            }, (reason) => {
                console.log('[info] Reason: ', String(reason));
                console.log('[ERROR] Unable to send message to Slack.');
            });
        });
    }

    do_send_picture({channel, caption, picture_url}) {
        return this.get_channel_id(channel).then((channel_id) => {
            return Tp.Helpers.Http.post('https://slack.com/api/chat.postMessage',
                'token=' + this.accessToken +
                '&as_user=true' +
                '&channel=' + encodeURIComponent(channel_id) +
                '&attachments=' + encodeURIComponent(JSON.stringify([{
                    fallback: caption,
                    pretext: caption,
                    image_url: picture_url
                }])), {
                    dataContentType: 'application/x-www-form-urlencoded'
                }
            ).then((response) => {
                console.log('[info] Got a valid response to our POST?');
                console.log('[info] Response: ', String(response));
                let parsed = JSON.parse(response);
                if (!parsed.ok) 
                    console.log('[ERROR] invalid response from http POST');
                
            }, (reason) => {
                console.log('[info] Reason: ', String(reason));
                console.log('[ERROR] Unable to send message to Slack.');
            });
        });
    }

    do_updateChannelPurpose({channel, purpose}) {
        return this.get_channel_id(channel).then((channel_id) => {
            if (channel_id === null)
                throw new Error("Channel not found!");
            return Tp.Helpers.Http.post('https://slack.com/api/channels.setPurpose',
                'token=' + this.accessToken +
                '&channel=' + encodeURIComponent(channel_id) +
                '&purpose=' + encodeURIComponent(purpose), {
                    dataContentType: 'application/x-www-form-urlencoded'
                }
            ).then((response) => {
                console.log('[info] Response: ', String(response));
                let parsed = JSON.parse(response);
                if (!parsed.ok) 
                    console.log('[ERROR] invalid response from http POST');
                
            }, (reason) => {
                console.log('[info] Reason: ', String(reason));
                console.log('[ERROR] Unable to send message to Slack.');
            });
        });
    }

    do_updateChannelTopic({channel, topic}) {
        return this.get_channel_id(channel).then((channel_id) => {
            if (channel_id === null)
                throw new Error("Channel not found!");
            return Tp.Helpers.Http.post('https://slack.com/api/channels.setTopic',
                'token=' + this.accessToken +
                '&channel=' + encodeURIComponent(channel_id) +
                '&topic=' + encodeURIComponent(topic), {
                    dataContentType: 'application/x-www-form-urlencoded'
                }
            ).then((response) => {
                console.log('[info] Response: ', String(response));
                let parsed = JSON.parse(response);
                if (!parsed.ok) 
                    console.log('[ERROR] invalid response from http POST');

            }, (reason) => {
                console.log('[info] Reason: ', String(reason));
                console.log('[ERROR] Unable to send message to Slack.');
            });
        });
    }

    do_setPresence({presence}) {
        return Tp.Helpers.Http.post('https://slack.com/api/users.setPresence',
            'token=' + this.accessToken +
            '&presence=' + encodeURIComponent(presence), {
                dataContentType: 'application/x-www-form-urlencoded'
            }).then((response) => {
            let parsed = JSON.parse(response);
            if (!parsed.ok) 
                console.log('[ERROR] invalid response from http POST');
            
        }, (reason) => {
            console.log('[info] Reason: ', String(reason));
            console.log('[ERROR] Unable to set presence');
        });
    }

    get_username(user_id) {
        // Construct the proper JSON message and send to channel
        return Tp.Helpers.Http.post('https://slack.com/api/users.info',
            'token=' + this.accessToken +
            '&user=' + encodeURIComponent(user_id), {
                dataContentType: 'application/x-www-form-urlencoded'
            }
        ).then((response) => {
            let parsed = JSON.parse(response);
            if (!parsed.ok) {
                console.log('[ERROR] invalid response from http POST (users.info)');
                throw new Error("Cannot find user " + user_id);
            }
            // console.log('[info] Translated Username: ', parsed.user.name);
            return parsed.user.name;
        }).catch((reason) => {
            console.log('[ERROR] Reason: ', String(reason));
            console.log('[ERROR] Unable to match the user_id:', user_id);
        });
    }

    get_channel_id(channel_name) {
        return Tp.Helpers.Http.post('https://slack.com/api/channels.list',
            'token=' + this.accessToken +
            '&exclude_archived=' + encodeURIComponent(1), {
                dataContentType: 'application/x-www-form-urlencoded'
            }
        ).then((response) => {
            let parsed = JSON.parse(response);
            if (!parsed.ok) {
                console.log('[ERROR] invalid response from http POST for channel list');
                return null;
            }
            for (let i = 0; i < parsed.channels.length; i++) {
                if (parsed.channels[i].name === channel_name)
                    return parsed.channels[i].id;
            }
            return null;
        });
    }
};
