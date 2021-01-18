"use strict";

const Tp = require('thingpedia');
const Owlbot = require('owlbot-js');


module.exports = class DictionaryAPIDevice extends Tp.BaseDevice {

  async get_get({word}) {
    let key = this.constructor.metadata.auth.api_key;
    let client = Owlbot(key);

    return client.define(word).then(function(result){
      let temp =  result["definitions"][0]["definition"];
      return [{"definition": temp}];
    });
  }
};
