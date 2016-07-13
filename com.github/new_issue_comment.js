const Source = require('./source');
const Url = require('url');

const POLL_INTERVAL = 60 * 1000; // 1m

module.exports = Source('issues/comments', POLL_INTERVAL, function(event, params) {
    var parsed = Url.parse(event.html_url);
    var issue_number = parseInt(parsed.pathname.substr(parsed.pathname.lastIndexOf('/') + 1));
    return [params[0], event.user.login, issue_number, event.body, new Date(event.created_at)];
}, function(event) {
    var repoName = event[0];
    var from = event[1];
    var number = event[2];
    var body = event[3];
    var date = event[4];

    return "%s commented on issue @%d in %s: %s".format(from, number, repoName, body);
});
