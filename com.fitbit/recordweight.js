// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2017 Rakesh Ramesh <rakeshr@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

const BASE_URL = 'https://api.fitbit.com/1/user/%s/body/log/weight.json';

function getDateString(date) {
    var dateString = date.getFullYear() + '-' + (date.getMonth()+1) + '-' + date.getDate();
    return dateString;
}

module.exports = new Tp.ChannelClass({
    Name: "RecordWeightFitbit",
    Extends: Tp.SimpleAction,

    _init: function(engine, device) {
        this.parent(engine, device);
        this.url = BASE_URL.format(this.device.userId);
    },

    _doInvoke: function(weight) {
        console.log('Weight logged : ' + weight);
        var postData = {
            weight: weight,
            date: getDateString(new Date())
        };
        var headers = {
            useOAuth2: this.device,
            dataContentType: 'application/json',
            accept: 'application/json'
        };

        // FIXME: Fitbit complains {"errors":[{"errorType":"validation","fieldName":"weight","message":"Weight is required"}]}
        return Tp.Helpers.Http.post(this.url, JSON.stringify(postData), headers).catch(function(error) {
            console.error('Error posting on Fitbit: ' + error.message);
        });
    }
});