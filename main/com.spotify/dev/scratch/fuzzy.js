"use strict";

const ElasticLunr = require("elasticlunr");
const searchResults = require("../../tmp/tupac.json");

const index = ElasticLunr(function () {
  this.setRef("id");
  this.addField("name");
  this.addField("popularity");
});

const byId = {};

for (const item of searchResults.artists.items) {
  index.addDoc({
    id: item.id,
    name: item.name,
    popularity: item.popularity,
  });
  byId[item.id] = item;
}

function search(term, opts = {}) {
  const results = index.search(term, opts);
  const items = results.map((result) => byId[result.ref]);
  console.log({term, opts, items});
}

search("tupac", {
  fields: {
    name: {boost: 1},
    popularity: {boost: 10},
  }
});

