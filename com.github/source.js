const Tp = require('thingpedia');

module.exports = function(what, interval, makeEvent, formatter) {
    return new Tp.ChannelClass({
        Name: 'GithubChannel' + what,
        Extends: Tp.HttpPollingTrigger,
        RequiredCapabilities: ['channel-state'],
        interval: interval,

        _init: function(engine, state, device, params) {
            this.parent();
            this._device = device;
            this._state = state;
            this._endpoint = what;

            this._params = params.slice(0, 1);
            this._repoName = this._params[0];
            if (!this._repoName)
                throw new TypeError("Missing required parameter");
            if (this._repoName.indexOf('/') < 0)
                this._repoName = device.userName + '/' + this._repoName;

            this.filterString = this._repoName;
            this._baseurl = 'https://api.github.com/repos/' +
                             this._repoName + '/' +
                             what;

            this.url = this._baseurl;
        },

        _doOpen: function() {
           return this.parent();
        },

        get auth() {
            return "token " + this._device.accessToken;
        },

        get userAgent() {
            return 'ThingEngine-Github-Interface';
        },

        formatEvent: formatter,

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
            var endpoint = this._endpoint;
            console.log("Last read: " + lastRead);
            if (lastRead === undefined) {
                var d = new Date();
                lastRead = d.toISOString();
            }

            if (endpoint == 'issues' ||
                endpoint == 'issues/comments' ||
                endpoint == 'milestones') {
		        console.log("Processing " + endpoint + "...");
                for (var i = 0; i < parsed.length; i++) {
                    // note that we're comparing dates as strings
                    // this is ok because the ISO format uses fixed width numbers
                    // and puts the numbers most significant first
                    if (parsed[i].created_at > lastRead) {
			            console.log("Item: " + i + ", Last read: " + lastRead +
				            ", ts: " + parsed[i].created_at);
                        this.emitEvent(makeEvent(parsed[i], this._params));
                    }
                }
	        } else if (endpoint == 'commits') {
		        console.log("Processing " + endpoint + "...");
                for (var i = 0; i < parsed.length; i++) {
                    if (parsed[i].commit.author.date > lastRead) {
                        this.emitEvent(makeEvent(parsed[i], this._params));
                    }
                }
            } else {
                console.log('Unknown endpoint...');
            }

            if (endpoint == 'commits') {
                lastRead = parsed[0].commit.author.date;
            } else if (endpoint == 'issues') {
		        lastRead = parsed[0].created_at;
	        } else if (endpoint == 'issues/comments' ||
                       endpoint == 'milestones') {
                lastRead = parsed[parsed.length - 1].created_at;
            }
	        console.log("Setting last read: " + lastRead);
            state.set('last-read', lastRead);
        }
    });
}
