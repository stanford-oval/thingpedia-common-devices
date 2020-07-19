// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Angela Xue <angelax@stanford.edu>
//                Bryce Taylor <btaylor3@stanford.edu>
//
// See LICENSE for details
"use strict";

const path = require('path');
const Tp = require('thingpedia');

module.exports = class DropboxDevice extends Tp.BaseDevice {
    static get runOAuth2() {
        return Tp.Helpers.OAuth2({
            kind: 'com.dropbox',
            authorize: 'https://www.dropbox.com/1/oauth2/authorize',
            get_access_token: 'https://api.dropboxapi.com/1/oauth2/token',
            callback(engine, accessToken, refreshToken) {
                var auth = 'Bearer ' + accessToken;
                return Tp.Helpers.Http.post('https://api.dropboxapi.com/2/users/get_current_account',
                                            JSON.stringify({ INPUT: 'null' }),
                                            { auth: auth,
                                              accept: 'application/json' }).then((response) => {
                    var parsed = JSON.parse(response);
                    return engine.devices.loadOneDevice({ kind: 'com.dropbox',
                                                          accessToken: accessToken,
                                                          refreshToken: refreshToken,
                                                          userId: parsed.account_id,
                                                          userName: parsed.name.display_name,
                                                          email: parsed.email }, true);
                });
            }
        });
    }

    constructor(engine, state) {
        super(engine, state);

        this.uniqueId = 'com.dropbox-' + this.userId;
        this.name = "Dropbox Account %s".format(this.email);
        this.description = "This is the Dropbox Account owned by %s.".format(this.userName);
    }

    get userId() {
        return this.state.userId;
    }

    get userName() {
        return this.state.userName;
    }

    get email() {
        return this.state.email;
    }

    checkAvailable() {
        return Tp.Availability.AVAILABLE;
    }

    get_get_space_usage() {
        return Tp.Helpers.Http.post('https://api.dropboxapi.com/2/users/get_space_usage', '',
                                    { useOAuth2: this, accept: 'application/json' }).then((response) => {
            var parsed = JSON.parse(response);
            return [{ used_space: parsed.used, total_space: parsed.allocation.allocated }];
        });
    }

    get_list_folder({ folder_name, order_by }) {
        folder_name = String(folder_name);
        if (!folder_name.startsWith('/'))
            folder_name = '/' + folder_name;
        if (folder_name === '/')
            folder_name = '';

        return Tp.Helpers.Http.post('https://api.dropboxapi.com/2/files/list_folder',
                                    JSON.stringify({ path: folder_name, recursive: false }),
                                    { useOAuth2: this, dataContentType: 'application/json',
                                      accept: 'application/json' }).then((data) => {
            const parsed = JSON.parse(data);

            return parsed.entries.map((entry) => {
                if (entry['.tag'] === 'folder') {
                    return { folder_name,
                             file_name: entry.name,
                             is_folder: true,
                             modified_time: null,
                             file_size: 0,
                             full_path: entry.path_lower };
                } else {
                    return { folder_name,
                             file_name: entry.name,
                             is_folder: false,
                             modified_time: Date.parse(entry.client_modified),
                             file_size: entry.size,
                             full_path: entry.path_lower };
                }
            });
        }).then((entries) => {
            switch (order_by) {
            case 'modified_time_decreasing':
                entries.sort((a, b) => b.modified_time - a.modified_time);
                break;
            case 'modified_time_increasing':
                entries.sort((a, b) => a.modified_time - b.modified_time);
                break;
            case 'name_decreasing':
                entries.sort((a, b) => -a.file_name.localeCompare(b.file_name));
                break;
            case 'name_increasing':
                entries.sort((a, b) => a.file_name.localeCompare(b.file_name));
                break;
            default:
            }
            return entries;
        });
    }

    get_open({ file_name }) {
        file_name = String(file_name);
        if (!file_name.startsWith('/'))
            file_name = '/' + file_name;
        if (file_name === '/')
            file_name = '';
        return Tp.Helpers.Http.post('https://api.dropboxapi.com/2/files/get_temporary_link',
                                    JSON.stringify({ path: file_name }),
                                    { useOAuth2: this,
                                      dataContentType: 'application/json',
                                      accept: 'application/json' }).then((response) => {
            const parsed = JSON.parse(response);
            return [{ file_name, url: parsed.link }];
        });
    }

    do_move({ old_name, new_name }) {
        old_name = String(old_name);
        new_name = String(new_name);
        if (!old_name.startsWith('/'))
            old_name = '/' + old_name;
        if (new_name.indexOf('/') < 0)
            new_name = path.resolve(path.dirname(old_name), new_name);
        if (!new_name.startsWith('/'))
            new_name = '/' + new_name;

        return Tp.Helpers.Http.post('https://api.dropboxapi.com/2/files/move',
                                    JSON.stringify({ from_path: old_name, to_path: new_name }),
                                    { useOAuth2: this,
                                      dataContentType: 'application/json',
                                      accept: 'application/json' });
    }

    do_create_new_folder({ folder_name }) {
        folder_name = String(folder_name);
        if (!folder_name.startsWith('/'))
            folder_name = '/' + folder_name;

        return Tp.Helpers.Http.post('https://api.dropboxapi.com/2/files/create_folder',
                                    JSON.stringify({ path: folder_name }),
                                    { useOAuth2: this,
                                      dataContentType: 'application/json',
                                      accept: 'application/json' });
    }
};
