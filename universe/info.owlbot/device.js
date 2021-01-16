"use strict";

const Tp = require('thingpedia');
const Owlbot = require('owlbot-js');


module.exports = class DictionaryAPIDevice extends Tp.BaseDevice {

  async get_get({word}) {
    var key = this.constructor.metadata.auth.api_key;
    var client = Owlbot(key);

    return client.define(word).then(function(result){
      console.log(result);
      let temp =  result["definitions"][0]["definition"];
      console.log(temp);
      return [{"definition": temp}];
    });
  }
};
