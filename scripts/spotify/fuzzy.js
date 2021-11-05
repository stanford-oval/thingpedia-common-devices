"use strict";

const Util = require("util");
const ElasticLunr = require("elasticlunr");
const searchResults = require("../../tmp/tupac.json");

const index = ElasticLunr(function () {
  this.setRef("id");
  this.addField("name");
  this.addField("popularity");
});

const docs = [];
const byId = {};

for (const item of searchResults.artists.items) {
  const doc = {
    id: item.id,
    name: item.name,
    popularity: item.popularity,
    score: 0.1,
  };
  index.addDoc(doc);
  byId[doc.id] = doc;
  docs.push(doc);
}

function search(term, opts = {}) {
  const results = index.search(term, opts);
  results.forEach((result) => {
    byId[result.ref].score = result.score;
  });
  docs.forEach((doc, index) => {
    doc.weighted = doc.popularity * (1 / doc.score) * (1 / (index + 1));
  });
  console.log(Util.inspect({term, opts, docs}, false, 10, true));
}

search("2Pac", {
  fields: {
    name: {boost: 1},
    popularity: {boost: 10},
  }
});

