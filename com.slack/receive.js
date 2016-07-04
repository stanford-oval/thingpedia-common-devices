// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2016 Luke Hsiao & Jeff Setter
//


const Tp = require('thingpedia');

/**
 * Gets the internal user id for a given username
 */
function getUsername(token, user_id) {
  // Construct the proper JSON message and send to channel
  return Tp.Helpers.Http.post('https://slack.com/api/users.info',
      'token=' + token +
      '&user=' + encodeURIComponent(user_id), {
        dataContentType: 'application/x-www-form-urlencoded'
      }
    )
    .then(function(response) {
      var parsed = JSON.parse(response);
      if (!parsed.ok) {
        console.log('[ERROR] invalid response from http POST (users.info)');
        throw ("Users.Info returned status of NOT OK for" + user_id);
      }
      // console.log('[info] Translated Username: ', parsed.user.name);
      return parsed.user.name;
    })
    .catch(function(reason) {
      console.log('[ERROR] Reason: ', String(reason));
      console.log('[ERROR] Unable to match the user_id:', user_id);
    });
}

function outoutUserMessages(SlackReceiveChannel, token, channel_name, ts, user, msg_text) {
  getUsername(token, user)
    .then(function(username) {
      SlackReceiveChannel.emitEvent([channel_name, ts, username, msg_text]);
    })
    .catch(function(reason) {
      console.log('[ERROR] channel history Reason: ', String(reason));
    });
}


/**
 * This goes through the [count] latest messages in the channel and emits events
 * for all messages newer than than last timestamp (lastTs).
 */
function channelHistory(SlackReceiveChannel, token, channel_name, channel_id, count, lastTs) {
  // Construct the proper JSON message and send to channel
  return Tp.Helpers.Http.post('https://slack.com/api/channels.history',
      'token=' + token +
      '&channel=' + encodeURIComponent(channel_id) +
      '&count=' + encodeURIComponent(count), {
        dataContentType: 'application/x-www-form-urlencoded'
      }
    )
    .then(function(response) {
      var parsed = JSON.parse(response);

      if (!parsed.ok) {
        console.log('[ERROR] invalid response from http POST (channel.history)');
        throw ("Channels.History returned status of NOT OK.");
      }

      var msgs = parsed.messages;

      for (var i = 0; i < msgs.length; i++) {
        var msg_text = msgs[i].text;
        var username = msgs[i].username;
        var ts = msgs[i].ts;
        var user = msgs[i].user;
        var msg_type = msgs[i].type;
        if (ts.localeCompare(lastTs) <= 0) {
          // console.log('[info] Reached most recent ts: ', lastTs);
          break;
        } else {
          if (msg_type.localeCompare('message') == 0) {
            if (username) {
              SlackReceiveChannel.emitEvent([channel_name, ts, username, msg_text]);
            } else if (user) {
              outoutUserMessages(SlackReceiveChannel, token, channel_name, ts, user, msg_text);
            }
          }
        }
      }
      return msgs[0].ts;
    })
    .catch(function(reason) {
      console.log('[info] Reason: ', String(reason));
      console.log('[ERROR] Unable to get channel history for ', channel_name);
    });
}


module.exports = new Tp.ChannelClass({
  Name: 'SlackReceiveChannel',
  Extends: Tp.PollingTrigger,
  interval: 4000,
  RequiredCapabilities: ['channel-state'],

  _init: function(engine, state, device, params) {
    this.parent();
    console.log('[info] Initializing SLACK:RECEIVE');
    this.auth = device.accessToken;
    this.user = device.state.user;
    this.state = state;
    this.interval = 4000; // Timer intervale in milliseconds
  },

  _doOpen: function() {
    console.log('[info] Calling doOpen of Receive.js');
    var d = new Date();
    var lastTs = d.getTime();
    this.state.set("lastTs", lastTs);
    return this.parent();
  },

  _onTick: function() {
    // console.log('[info] Tick!');

    var channel_id = 'INIT';
    var token = this.auth;
    var user = this.user;
    var lastTs = this.state.get("lastTs");
    var state = this.state;
    var SlackReceiveChannel = this;

    // console.log('[info] LastTs: ', lastTs);

    // Mapping channel name to channel ID
    // Construct the proper JSON message and send to channel
    Tp.Helpers.Http.post('https://slack.com/api/channels.list',
        'token=' + token +
        '&exclude_archived=' + encodeURIComponent(1), {
          dataContentType: 'application/x-www-form-urlencoded'
        }
      )
      .then(function(response) {
        // console.log('[info] Got a response for channels.list');
        var parsed = JSON.parse(response);

        // console.log('[info] Response: ', String(response));

        if (!parsed.ok) {
          console.log('[ERROR] invalid response from http POST for channel list');
          return;
        }

        // Iterate over channels, and check all new messages.
        var channels = parsed.channels;
        for (var i = 0; i < channels.length; i++) {
          // console.log('[info] checking channel: ', channels[i].name);
          // Check the 10 latest messages
          channelHistory(SlackReceiveChannel, token, channels[i].name, channels[i].id, 10, lastTs)
            .then(function(channel_lastTs) {
              // console.log('[info] Channel_lastTs', channel_lastTs);

              // If the latest message of this channel is more recent than what we
              // have been tracking so far, save this timestamp.
              if (channel_lastTs.localeCompare(lastTs) > 0) {
                lastTs = channel_lastTs;
                state.set("lastTs", lastTs);
                console.log('[info] Updated LastTS to: ', lastTs);
              }
            })
            .catch(function(reason) {
              console.log('[ERROR] Couldnt get channel history');
            });

        }
      })
      .catch(function(reason) {
        console.log('[info] Reason: ', String(reason));
        console.log('[ERROR] Unable to get channel list.');
      });
  },
});
