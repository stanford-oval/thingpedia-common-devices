// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-

'use strict';

const Tp = require('thingpedia');

const USER_URL = 'https://a.wunderlist.com/api/v1/user';
const LIST_URL = 'https://a.wunderlist.com/api/v1/lists';
const TASK_URL = 'https://a.wunderlist.com/api/v1/tasks';

function date_diff_days(str_date) {
  const today = new Date();
  const date = new Date(str_date);
  const timeDiff = Math.abs(today.getTime() - date.getTime());
  return Math.ceil(timeDiff / (1000 * 3600 * 24));
}

module.exports = class WunderlistDevice extends Tp.BaseDevice {
  static get runOAuth2() {
    return Tp.Helpers.OAuth2({
      kind: 'com.wunderlist',
      scope: null,
      set_state: true,
      authorize: 'https://www.wunderlist.com/oauth/authorize',
      get_access_token: 'https://www.wunderlist.com/oauth/access_token',
      redirect_uri:
        'https://thingengine.stanford.edu/devices/oauth2/callback/com.wunderlist',

      callback(engine, accessToken, refreshToken) {
        return Tp.Helpers.Http.get(USER_URL, {
          accept: 'application/json',
          extraHeaders: {
            'x-access-token': accessToken,
            'x-client-id': WunderlistDevice.metadata.auth.client_id
          }
        }).then(response => {
          const parsed = JSON.parse(response);
          return engine.devices.loadOneDevice(
            {
              kind: 'com.wunderlist',
              accessToken: accessToken,
              refreshToken: refreshToken,
              userId: parsed.id,
              userName: parsed.name
            },
            true
          );
        });
      }
    });
  }

  constructor(engine, state) {
    super(engine, state);

    this.uniqueId = 'com.wunderlist-' + this.userId;
    this.name = 'Wunderlist Account of %s'.format(this.userName);
    this.description = 'This is your Wunderlist Account';
  }

  get userId() {
    return this.state.userId;
  }

  get userName() {
    return this.state.userName;
  }

  checkAvailable() {
    return Tp.Availability.AVAILABLE;
  }

  get_get_lists() {
    return Tp.Helpers.Http.get(LIST_URL, {
      accept: 'application/json',
      extraHeaders: {
        'x-access-token': this.accessToken,
        'x-client-id': WunderlistDevice.metadata.auth.client_id
      }
    }).then(response => {
      const parsed = JSON.parse(response);
      let result = [];
      parsed.forEach(elem => {
        result.push({
          id: elem.id,
          title: elem.title,
          created_at: new Date(elem.created_at).toLocaleDateString()
        });
      });
      return result;
    });
  }

  get_get_tasks({ list_title, time_window, completed }) {
    let p = [];
    return this.get_get_lists()
      .then(lists => {
        lists.forEach(list => {
          if (
            !list_title ||
            list_title.toLowerCase() === list.title.toLowerCase()
          ) {
            p.push(
              new Promise((resolve, reject) => {
                let url = TASK_URL + '?list_id=%d'.format(list.id);
                if (completed) {
                  url += '&completed=true';
                }
                Tp.Helpers.Http.get(url, {
                  accept: 'application/json',
                  extraHeaders: {
                    'x-access-token': this.accessToken,
                    'x-client-id': WunderlistDevice.metadata.auth.client_id
                  }
                }).then(tasks => {
                  resolve(JSON.parse(tasks));
                });
              })
            );
          }
        });
        return Promise.all(p);
      })
      .then(r_list => {
        let results = [];
        for (let i = 0; i < r_list.length; i++) {
          const cur_list = r_list[i];
          for (let j = 0; j < cur_list.length; j++) {
            const task_elem = cur_list[j];
            const twind = time_window ? time_window : 30;
            if (date_diff_days(task_elem.created_at) <= twind) {
              results.push({
                id: task_elem.id,
                created_at: new Date(task_elem.created_at).toLocaleDateString(),
                due_date: task_elem.due_date || 'No due date set',
                starred: task_elem.starred,
                title: task_elem.title
              });
            }
          }
        }
        return results;
      });
  }
};
