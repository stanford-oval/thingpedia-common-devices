// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
// Copyright 2016 Linyu He <linyu90@stanford.edu>
//                Lingbin Li <lingbin@stanford.edu>
//
// See COPYING for details
"use strict";

const Tp = require('thingpedia');

const PAGE_SIZE = 10;

module.exports = class GoogleDriveDevice extends Tp.BaseDevice {
    static get runOAuth2() {
        return Tp.Helpers.OAuth2({
            kind: 'com.google.drive',
            scope: ['openid','profile','email',
                    'https://www.googleapis.com/auth/drive',
                    'https://www.googleapis.com/auth/drive.appdata',
                    'https://www.googleapis.com/auth/drive.file'],
            authorize: 'https://accounts.google.com/o/oauth2/auth',
            get_access_token: 'https://www.googleapis.com/oauth2/v3/token',
            set_access_type: true,
            callback(engine, accessToken, refreshToken) {
                var auth = 'Bearer ' + accessToken;
                return Tp.Helpers.Http.get('https://www.googleapis.com/oauth2/v2/userinfo', { auth: auth, accept: 'application/json' })
                .then((response) => {
                    var parsed = JSON.parse(response);
                    return engine.devices.loadOneDevice({ kind: 'com.google.drive',
                                                          accessToken: accessToken,
                                                          refreshToken: refreshToken,
                                                          profileId: parsed.id,
                                                          userName: parsed.name }, true);
                });
            }
        });
    }

    constructor(engine, state) {
        super(engine, state);

        // NOTE: for legacy reasons, this is google-account-*, not com.google-* as one would
        // hope
        // please do not follow this example
        this.uniqueId = 'google-drive-' + this.profileId;
        this.name = "Google Drive Account %s".format(this.userName);
        this.description = "This is your Google Drive Account. You can use it to access and manage files on Google Drive.";
    }

    get profileId() {
        return this.state.profileId;
    }

    get userName() {
        return this.state.userName;
    }

    do_create_new_drive_file({ file_name }) {
        var url = 'https://www.googleapis.com/drive/v3/files';
        var data = JSON.stringify({ name: file_name });

        return Tp.Helpers.Http.post(url, data, { useOAuth2: this, dataContentType: 'application/json' });
    }

    get_list_drive_files({ order_by }) {
        const ORDER_CLAUSES = {
            'modified_time_decreasing': 'modifiedTime desc',
            'modified_time_increasing': 'modifiedTime asc',
            'created_time_decreasing': 'createdTime desc',
            'created_time_increasing': 'createdTime asc',
            'name_decreasing': 'name desc',
            'name_increasing': 'name asc',
        };
        const order = ORDER_CLAUSES[order_by || 'modified_time_decreasing'];
        const url = `https://www.googleapis.com/drive/v3/files?orderBy=${order}&pageSize=${PAGE_SIZE}&fields=*`;
        return Tp.Helpers.Http.get(url, { useOAuth2: this, dataContentType: 'application/json' }).then((response) => {
            const parsedResponse = JSON.parse(response);
            return parsedResponse.files.map((file) => {
                console.log(JSON.stringify(file));
                let last_modified_by = file.lastModifyingUser;
                if (last_modified_by)
                    last_modified_by = last_modified_by.displayName || last_modified_by.emailAddress || 'anonymous user';
                else if (file.owners && file.owners.length === 1)
                    last_modified_by = file.owners[0].displayName || file.owners[0].emailAddress || 'unknown user';
                else
                    last_modified_by = 'unknown user';
                return ({
                    file_id: file.id,
                    file_name: file.name,
                    mime_type: file.mimeType,
                    description: file.description,
                    starred: file.starred,
                    created_time: new Date(file.createdTime),
                    modified_time: new Date(file.modifiedTime),
                    last_modified_by: last_modified_by,
                    file_size: file.size||0,
                    link: file.webViewLink
                });
            });
        });
    }
};

