const Twitter = require('twitter-node-client').Twitter;

module.exports = {
    // encryption ;)
    rot13: function(x) {
        return Array.prototype.map.call(x, (ch) => {
            var code = ch.charCodeAt(0);
            if (code >= 0x41 && code <= 0x5a)
                code = (((code - 0x41) + 13) % 26) + 0x41;
            else if (code >= 0x61 && code <= 0x7a)
                code = (((code - 0x61) + 13) % 26) + 0x61;

            return String.fromCharCode(code);
        }).join('');
    },

    makeTwitterApi: function(engine, consumerKey, consumerSecret, accessToken, accessTokenSecret) {
        var origin = engine.platform.getOrigin();
        return new Twitter({
            consumerKey: consumerKey,
            consumerSecret: consumerSecret,
            callBackUrl: origin + '/devices/oauth2/callback/com.twitter',
            accessToken: accessToken,
            accessTokenSecret: accessTokenSecret
        });
    },

    pollUserId: function(twitterApi, screen_name) {
        return new Promise((callback, errback) => {
            twitterApi.getUser({ screen_name }, errback, callback);
        }).then((response) => {
            return JSON.parse(response).id;
        }).catch((e) => {
            console.log(e);
        });
    },

    pollDirectMessages: function(twitterApi, since_id, screenName) {
        return new Promise((callback, errback) => {
            if (since_id !== undefined)
                twitterApi.getCustomApiCall('/direct_messages/events/list.json', { since_id: since_id, count: 20 }, errback, callback);
            else
                twitterApi.getCustomApiCall('/direct_messages/events/list.json', { count: 20 }, errback, callback);
        }).then((results) => Promise.all(JSON.parse(results).events.map((dm) => {
            console.log(JSON.stringify(dm));
            return _pollUserScreenName(twitterApi, dm.message_create.sender_id).then((screen_name) => {
                return {
                    sender: screen_name,
                    message: dm.message_create.message_data.text
                };
            });
        }))).then((results) => results.filter((dm) => dm.sender.toLowerCase() !== screenName.toLowerCase()));
    }
};

function _pollUserScreenName(twitterApi, user_id) {
    return new Promise((callback, errback) => {
        twitterApi.getUser({ user_id }, errback, callback);
    }).then((response) => {
        return JSON.parse(response).screen_name;
    }).catch((e) => {
        console.log(e);
    });
};