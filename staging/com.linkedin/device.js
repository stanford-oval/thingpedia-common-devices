// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

const PROFILE_URL = 'https://api.linkedin.com/v2/me';
const SHARE_URL = 'https://api.linkedin.com/v2/ugcPosts';

module.exports = class LinkedinDevice extends Tp.BaseDevice {
    static get runOAuth2() {
        return Tp.Helpers.OAuth2({
            scope: ['r_emailaddress','r_liteprofile','w_member_social'],
            authorize: 'https://www.linkedin.com/oauth/v2/authorization',
            get_access_token: 'https://www.linkedin.com/oauth/v2/accessToken',
            set_state: true,

            callback(engine, accessToken, refreshToken) {
                const auth = 'Bearer ' + accessToken;
                return Tp.Helpers.Http.get(PROFILE_URL,
                                           { auth: auth,
                                             accept: 'application/json' }).then((response) => {
                    const parsed = JSON.parse(response);
                    return engine.devices.loadOneDevice({ kind: 'com.linkedin',
                                                          accessToken: accessToken,
                                                          refreshToken: refreshToken,
                                                          userId: parsed.id,
                                                          userName: parsed.formattedName
                                                        }, true);
                });
            }
        });
    }

    constructor(engine, state) {
        super(engine, state);

        this.uniqueId = 'com.linkedin-' + this.userId;
        this.name = "LinkedIn Account of %s".format(this.userName);
        this.description = "This is your LinkedIn account";
    }

    get userId() {
        return this.state.userId;
    }

    get userName() {
        return this.state.userName;
    }

    checkAvailable() {
        return Tp.Availability.AVAILABLE;
    }

    do_share({ status }) {
        return Tp.Helpers.Http.post(SHARE_URL, JSON.stringify({
            'author': 'urn:li:person:' + this.state.userId,
            'lifecycleState': 'PUBLISHED',
            'specificContent': {
                'com.linkedin.ugc.ShareContent': {
                    'shareCommentary': {
                        'text': status
                    },
                    'shareMediaCategory': 'NONE'
                }
            },
            'visibility': {
                'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
            }
        }), {
            useOAuth2: this,
            dataContentType: 'application/json',
            accept: 'application/json'
        });
    }
};

