// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

const URL = "https://people.googleapis.com/v1/"

module.exports = class GoogleContactsDevice extends Tp.BaseDevice {
    static get runOAuth2() {
        return Tp.Helpers.OAuth2({
            kind: 'com.google.contacts',
            scope: ['openid','profile', 'email',
                'https://www.googleapis.com/auth/contacts.readonly'],
            authorize: 'https://accounts.google.com/o/oauth2/auth',
            get_access_token: 'https://www.googleapis.com/oauth2/v3/token',
            set_access_type: true,
            callback(engine, accessToken, refreshToken) {
                var auth = 'Bearer ' + accessToken;
                return Tp.Helpers.Http.get('https://www.googleapis.com/oauth2/v2/userinfo', { auth: auth, accept: 'application/json' })
                .then((response) => {
                    var parsed = JSON.parse(response);
                    return engine.devices.loadOneDevice({ kind: 'com.google.contacts',
                                                          accessToken: accessToken,
                                                          refreshToken: refreshToken,
                                                          profileId: parsed.id, 
                                                          userName: parsed.name}, true);
                });
            }
        });
    }

    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'com.google.contacts-' + this.userId;
        this.name = "Google Contacts Account of %s".format(this.userName);
        this.description = "This is your Google Contacts Account.";
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

    contactInfo(entry) {
        var info = {};
        if(entry.names !== undefined){
            info.name = entry.names[0].displayName;
        } else {
            info.name = "";
        }
        if(entry.phoneNumbers !== undefined){
            info.phone_number = entry.phoneNumbers[0].value;
        } else {
            info.phone_number = "";
        }
        if(entry.emailAddresses !== undefined){
            info.email = entry.emailAddresses[0].value;
        } else {
            info.email = "";
        }
        return info;
    }

    get_get_contacts() {
        return Tp.Helpers.Http.get(URL + "people/me/connections?personFields=emailAddresses,names,phoneNumbers", {
            useOAuth2: this,
            dataContentType: 'application/json' 
            }).then((response) => {
                const parsed = JSON.parse(response);
                return parsed.connections.map(this.contactInfo);
            });
    }
};

