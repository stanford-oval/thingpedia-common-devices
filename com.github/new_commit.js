const Source = require('./source');

const POLL_INTERVAL = 60 * 1000; // 1m

module.exports = Source('commits', POLL_INTERVAL, function(event, params) {
        return [params[0], event.author.login, event.commit.message,
                new Date(event.commit.author.date)];
}, function(event) {
    var repoName = event[0];
    var from = event[1];
    var message = event[2];
    var date = event[3];

    return "New commit in %s by %s: %s".format(repoName, from, message);
});
