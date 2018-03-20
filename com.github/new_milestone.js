// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Andrew Lim <alim16@stanford.edu>
//                Xiangyu Yue <xyyue@stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

const POLL_INTERVAL = 60 * 1000; // 1m

// milestones is different from the other triggers because there is no webhook or events API for it
module.exports = new Tp.ChannelClass({
    Name: 'GithubMilestonePoller',
    Extends: Tp.HttpPollingTrigger,
    RequiredCapabilities: ['channel-state'],
    interval: POLL_INTERVAL,

    _init(engine, state, device, params) {
        this.parent(engine, state, device, params);
        this._state = state;

        this._params = params.slice(0, 1);
        this._repoName = this._params[0];
        if (!this._repoName)
            throw new TypeError("Missing required parameter");
        if (this._repoName.indexOf('/') < 0)
            this._repoName = device.userName + '/' + this._repoName;

        this.filterString = this._repoName;

        this._endpoint = 'milestones';
        this.url = 'https://api.github.com/repos/' +
                    this._repoName + '/milestones';
    },

    get auth() {
        return "token " + this.device.accessToken;
    },

    get userAgent() {
        return 'ThingEngine-Github-Interface';
    },

    formatEvent(event) {
        var repoName = event[0];
        var user = event[1];
        var title = event[2];
        var date = event[3];

        switch (hint) {
        case 'string-title':
            return "New milestone created in %s".format(repoName);
        case 'string-body':
            return "Title: %s.\nAuthor: %s".format(title, user);
        default:
            return "New milestone created by %s in %s: %s".format(user, repoName, title);
        }
    },

    _onResponse: function(response) {
        var state = this._state;

        var parsed;
        try {
            parsed = JSON.parse(response);
        } catch(e) {
            console.log('Error parsing Github server response: ' + e.message);
            console.log('Full response was');
            console.log(response);
            return;
        }

        if (parsed.length == 0)
            return;

        var lastRead = state.get('last-read');
        console.log("Last read: " + lastRead);
        if (lastRead === undefined) {
            var d = new Date();
            lastRead = d.toISOString();
        }

        console.log("Processing " + endpoint + "...");
        for (var i = 0; i < parsed.length; i++) {
            // note that we're comparing dates as strings
            // this is ok because the ISO format uses fixed width numbers
            // and puts the numbers most significant first
            if (parsed[i].created_at > lastRead) {
                console.log("Item: " + i + ", Last read: " + lastRead +
                    ", ts: " + parsed[i].created_at);
                this.emitEvent([this._params[0], parsed[i].creator.login, parsed[i].description, new Date(parsed[i].created_at)]);
            }
        }

        lastRead = parsed[parsed.length - 1].created_at;
        console.log("Setting last read: " + lastRead);
        state.set('last-read', lastRead);
    }
});
