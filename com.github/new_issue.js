const Source = require('./source');

const POLL_INTERVAL = 60 * 1000; // 1m

module.exports = Source('issues', POLL_INTERVAL, function(event, params) {
        return [params[0], event.user.login, event.number, event.title,
                event.body, new Date(event.created_at)];
}, function(event) {
    var repoName = event[0];
    var from = event[1];
    var number = event[2];
    var title = event[3];
    var body = event[4];
    var date = event[5];

    return "Issue @%d opened in %s by %s: %s".format(number, repoName, from, title);
});
