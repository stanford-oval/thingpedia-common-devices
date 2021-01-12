"use strict";

const Tp = require('thingpedia');
const Owlbot = require('owlbot-js')
const client = Owlbot('5424c7b02c9bf605e23e67bfaed1f52341842ea0')

module.exports = class DictionaryAPIDevice extends Tp.BaseDevice {

    async get_get({word}) {
      client.define(word).then(function(result){
        console.log(result);
        let temp =  result["definitions"][0]["definition"];
        console.log(temp);
        return temp;
      });

    }
};
