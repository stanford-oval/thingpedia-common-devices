const Source = require('./source');

const POLL_INTERVAL = 60 * 1000; // 1m

module.exports = Source('milestones', POLL_INTERVAL, function(event, params) {
    return [params[0], event.creator.login, event.description, new Date(event.created_at)];
}, function(event) {
    var repoName = event[0];
    var user = event[1];
    var title = event[2];
    var date = event[3];

    return "New milestone created by %s in %s: %s".format(user, repoName, title);
});
