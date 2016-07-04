// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Luke Hsiao & Jeff Setter
//

const Tp = require('thingpedia');

/**
 * Updates the specified Slack channel's topic.
 */
function setChannelTopic(token, channel_id, topic) {
  // Construct the proper JSON message and send to channel
  Tp.Helpers.Http.post('https://slack.com/api/channels.setTopic',
      'token=' + token +
      '&channel=' + encodeURIComponent(channel_id) +
      '&topic=' + encodeURIComponent(topic), {
        dataContentType: 'application/x-www-form-urlencoded'
      }
    )
    .then(function(response) {
      console.log('[info] Response: ', String(response));
      var parsed = JSON.parse(response);
      if (!parsed.ok) {
        console.log('[ERROR] invalid response from http POST');
      }
    }, function(reason) {
      console.log('[info] Reason: ', String(reason));
      console.log('[ERROR] Unable to send message to Slack.');
    });
}

module.exports = new Tp.ChannelClass({
  Name: 'SlackUpdateChannelTopicChannel',

  _init: function(engine, device) {
    this.parent();
    console.log('[info] Initializing SLACK:UpdateChannelTopic');
    this.auth = device.accessToken;
  },

  sendEvent: function(event) {
    console.log('[info] Sending to Slack:', event);

    var channel_id = 'INIT';
    var token = this.auth;

    // Mapping channel name to channel ID
    // Construct the proper JSON message and send to channel
    console.log('[info] Getting Channel List');
    Tp.Helpers.Http.post('https://slack.com/api/channels.list',
        'token=' + token +
        '&exclude_archived=' + encodeURIComponent(1), {
          dataContentType: 'application/x-www-form-urlencoded'
        }
      )
      .then(function(response) {
        console.log('[info] Got a response for channels.list');
        var parsed = JSON.parse(response);

        if (!parsed.ok) {
          console.log('[ERROR] invalid response from http POST for channel list');
          return;
        }

        // Iterate over channels, match the channel name given (event[0]) and save
        // the channel ID
        var channels = parsed.channels;
        for (var i = 0; i < channels.length; i++) {
          console.log('[info] checking channel: ', channels[i].name);
          if (channels[i].name.localeCompare(event[0]) == 0) {
            channel_id = channels[i].id;
            console.log('[info] changing channel id to', channel_id);
            break;
          }
        }

        if (channel_id.localeCompare('INIT') == 0) {
          console.log('[ERROR] could not find channel name');
        }

        // Now that we have the internal channel id, post the message.
        setChannelTopic(token, channel_id, event[1]);

      }, function(reason) {
        console.log('[info] Reason: ', String(reason));
        console.log('[ERROR] Unable to get channel list.');
      });
  },
});
