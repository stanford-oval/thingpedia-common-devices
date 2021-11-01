/* eslint-disable curly */
"use strict";

const ElasticLunr = require("elasticlunr");
const yargs = require("yargs/yargs");
const { hideBin } = require("yargs/helpers");
const https = require("https");
const url = require("url");


const INDEX = ElasticLunr(function () {
  this.setRef("id");
  this.addField("name");
  this.addField("popularity");
});


function search(query, type, token, limit = 10) {
  const qs = String(new url.URLSearchParams({query, type, limit}));

  return new Promise((resolve, reject) => {
    if (!token || token === "") reject(new Error("No token"));

    let data = "";

    const req = https.request({
      hostname: "api.spotify.com",
      path: `/v1/search?${qs}`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      }
    }, (res) => {
      res.on("data", (d) => { data += d; });
      res.on("end", () => resolve(data));
    });

    req.on("error", (error) => reject(error));
    req.end();
  }).then((data) => {
    return JSON.parse(data);
  });
}


async function main() {
  const args = yargs(hideBin(process.argv)).argv;
  const token = args.token || process.env.SPOTIFY_TOKEN;
  const type = args.type || "artist";
  const query = args._.join(" ");
  const a = Number(args.a || 0.25);
  const b = Number(args.b || 0.1);
  const p = Number(args.p || 1);

  console.log({query, type, a, b, p});

  const rsp = await search(query, type, token);
  const items = type === "artist" ? rsp.artists.items : rsp.tracks.items;

  const docs = items.map((item, index) => ({
    id: item.id,
    name: item.name,
    popularity: item.popularity,
    rank: index + 1,
    score: 0,
  })).filter((doc) => doc.popularity > 10);

  docs.forEach((doc) => INDEX.addDoc(doc));
  const docsById = {};
  docs.forEach((doc) => { docsById[doc.id] = doc; });

  INDEX.search(query).forEach((result) => {
    docsById[result.ref].score = result.score;
  });

  docs.forEach((doc) => {
    doc.weight = (
      (p * 0.01 * doc.popularity) +
      (a * doc.score) -
      (b * doc.rank)
    );
  });

  docs.sort((d1, d2) => {
    if (d1.weight === d2.weight) {
      return 0;
    } else if (d1.weight > d2.weight) {
      return -1;
    } else {
      return 1;
    }
  });

  console.table(docs);
}

main();
