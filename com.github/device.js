// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Andrew Lim <alim16@stanford.edu>
//                Xiangyu Yue <xyyue@stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');
const fs = require('fs');
const FormData = require('form-data');

module.exports = class GithubDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);

        this.uniqueId = 'com.github-' + this.userId;
        this.name = "Github Account %s".format(this.userName);
        this.description = "This is your Github account";
    }

    get userId() {
        return this.state.userId;
    }

    get userName() {
        return this.state.userName;
    }

    get auth() {
        return 'token ' + this.state.accessToken;
    }

    static get userAgent() {
        return 'ThingEngine-Github-Interface';
    }

    get options() {
        return { auth: this.auth, 'user-agent': GithubDevice.userAgent };
    }

    static get runOAuth2() {
        return Tp.Helpers.OAuth2({
            scope: ["user", "public_repo", "repo", "repo:status",
                "gist", "notifications"],
            authorize: 'https://github.com/login/oauth/authorize',
            get_access_token: 'https://github.com/login/oauth/access_token',

            // we need to force thingengine.stanford.edu as redirect uri
            // because github does not allow multiple redirect uris in the
            // configuration
            redirect_uri: 'https://thingengine.stanford.edu/devices/oauth2/callback/com.github',

            callback: function(engine, accessToken, refreshToken) {
                const auth = 'token ' + accessToken;
                const userAgent = GithubDevice.userAgent;
                return Tp.Helpers.Http.get('https://api.github.com/user',
                                           { auth: auth,
                                             'user-agent': userAgent,
                                             accept: 'application/json' })
                    .then(function(response) {
                        const parsed = JSON.parse(response);
                        return engine.devices.loadOneDevice({ kind: 'com.github',
                            accessToken: accessToken,
                            refreshToken: refreshToken,
                            userId: parsed.id,
                            userName: parsed.login
                        }, true);
                    });
            }
        });
    }

    get_get_commit({ repo_name }) {
        const url = 'https://api.github.com/repos/' + repo_name + '/commits';
        return Tp.Helpers.Http.get(url, this.options).then((response) => {
            const parsed = JSON.parse(response);
            return Promise.all(parsed.map((commit) => {
                return Tp.Helpers.Http.get(url + '/' + commit.sha, this.options).then((response) => {
                    const parsed = JSON.parse(response);
                    let modified_files = [];
                    let added_files = [];
                    let deleted_files = [];
                    for (let file of parsed.files) {
                        if (file.status === 'modified')
                            modified_files.push(file.filename.toLowerCase());
                        if (file.status === 'added')
                            added_files.push(file.filename.toLowerCase());
                        if (file.status === 'deleted')
                            deleted_files.push(file.filename.toLowerCase());
                    }
                    console.log(modified_files);
                    return {
                        user: parsed.author.login,
                        message: parsed.commit.message,
                        time: new Date(parsed.commit.author.date),
                        modified_files,
                        added_files,
                        deleted_files
                    };

                });
            }));
        });
    }

    //TODO: add state (open/closed), labels, sort/direction, assignee/mentioned
    get_get_issue({ repo_name }) {
        const url = 'https://api.github.com/repos/' + repo_name + '/issues';
        return Tp.Helpers.Http.get(url, this.options).then((response) => {
            const parsed = JSON.parse(response);
            return Promise.all(parsed.map((issue) => {
                return {
                    user: issue.user.login,
                    number: issue.number,
                    title: issue.title,
                    body: issue.body,
                    time: new Date(issue.created_at)
                };
            }));
        });
    }

    get_get_issue_comment({ repo_name }) {
        const url = 'https://api.github.com/repos/' + repo_name + '/issues/comments';
        return Tp.Helpers.Http.get(url, this.options).then((response) => {
            const parsed = JSON.parse(response);
            return Promise.all(parsed.map((comment) => {
                // issue number is removed from github api v3
                // extract from the html_url
                // e.g., https://github.com/repo_name/issues/21#issuecomment-232640607
                let issue_number = comment.html_url.match(/([1-9])+(?=#issuecomment)/);
                return {
                    user: comment.user.login,
                    body: comment.body,
                    issue_number: parseInt(issue_number),
                    time: new Date(comment.created_at)
                };
            }));
        });
    }

    get_get_milestone({ repo_name }) {
        const url = 'https://api.github.com/repos/' + repo_name + '/milestones';
        return Tp.Helpers.Http.get(url, this.options).then((response) => {
            const parsed = JSON.parse(response);
            return Promise.all(parsed.map((milestone) => {
                return {
                    user: milestone.user.login,
                    title: milestone.title,
                    description: milestone.description,
                    time: new Date(milestone.created_at)
                };
            }));
        });
    }

    get_get_file({ repo_name, file_name }) {
        const baseUrl = 'https://api.github.com/repos/' + repo_name;
        return Tp.Helpers.Http.get(baseUrl + '/contents/' + file_name, this.options).then((response) => {
            const sha = JSON.parse(response).sha;
            return Tp.Helpers.Http.get(baseUrl + '/git/blobs/' + sha, this.options).then((response) => {
                const content = JSON.parse(response).content;
                const name = file_name.replace(/^.*[\\\/]/, '');
                const path = this.engine.platform.getCacheDir() + '/' + name;
                try {
                    fs.writeFileSync(path, content, 'base64');
                    const formData = new FormData();
                    const stream = fs.createReadStream(path);
                    formData.append('file', stream, { contentType: stream.contentType });
                    return Tp.Helpers.Http.postStream(
                        'https://file.io?expires=1d',
                        formData,
                        { dataContentType: 'multipart/form-data; boundary=' + formData.getBoundary() }
                    ).then((response) => {
                        return [{ url: JSON.parse(response).link }];
                    }).catch((e) => {
                        console.log('Failed to generate the temporary link', e);
                        throw e;
                    });
                } catch (e) {
                    console.log(e);
                    throw e;
                }
            });
        });
    }

    do_add_email({ email }) {
        const url = 'https://api.github.com/user/emails';
        return Tp.Helpers.Http.post(url, JSON.stringify([email.value]), this.options);
    }

    do_comment_issue({ repo_name, issue_number, body }) {
        const url = 'https://api.github.com/repos/' + repo_name + '/issues/' + issue_number + '/comments';
        return Tp.Helpers.Http.post(url, JSON.stringify({ body: body }), this.options);
    }
};


