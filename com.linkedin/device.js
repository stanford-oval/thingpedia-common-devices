// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

const PROFILE_URL = 'https://api.linkedin.com/v1/people/~:(id,formatted-name,headline,industry,specialties,positions,picture-url)?format=json';
const SHARE_URL = 'https://api.linkedin.com/v1/people/~/shares?format=json';

module.exports = class LinkedinDevice extends Tp.BaseDevice {
    static get runOAuth2() {
        return Tp.Helpers.OAuth2({
            authorize: 'https://www.linkedin.com/uas/oauth2/authorization',
            get_access_token: 'https://www.linkedin.com/uas/oauth2/accessToken',
            set_state: true,

            callback(engine, accessToken, refreshToken) {
                const auth = 'Bearer ' + accessToken;
                return Tp.Helpers.Http.get('https://api.linkedin.com/v1/people/~:(id,formatted-name)?format=json',
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

    get_get_profile() {
        return Tp.Helpers.Http.get(PROFILE_URL, {
            useOAuth2: this,
            accept: 'application/json' }).then((response) => {
            const parsed = JSON.parse(response);

            return [{ formatted_name: parsed.formattedName,
                      headline: parsed.headline || '',
                      industry: parsed.industry || '',
                      specialties: parsed.specialties || '',
                      positions: ('values' in parsed) ? parsed.positions.values.map((p) => p.summary) : [],
                      profile_picture: parsed.pictureUrl || '' }];
        });
    }

    do_share({ status }) {
        return Tp.Helpers.Http.post(SHARE_URL, JSON.stringify({
            comment: status,
            visibility: {
                code: 'anyone'
            }
        }), {
            useOAuth2: this,
            dataContentType: 'application/json',
            accept: 'application/json'
        });
    }
};

