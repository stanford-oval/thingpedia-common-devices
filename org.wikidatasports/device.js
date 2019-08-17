// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2019 Silei Xu <silei@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require("thingpedia");
const ThingTalk = require("thingtalk");

module.exports = class WikidataSportsClass extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = "org.wikidatasports";
        this.name = "Wikidata Sports";
        this.description = "Sports related question answering on wikdiata";

        this.url = "https://query.wikidata.org/sparql";
    }

    async query(query) {
        const sparql = ThingTalk.Helper.toSparql(query);
        if (!sparql) {
            throw new Error(
                `Failed to convert query "${query.prettyprint()}", got ${sparql}`
            );
        }
        console.log(sparql);
        return Tp.Helpers.Http.get(
            `${this.url}?query=${encodeURIComponent(sparql)}`,
            {
                accept: "application/json",
            }
        ).then((result) => {
            const parsed = JSON.parse(result).results.bindings;
            return parsed.map((r) => {
                const res = {};
                Object.keys(r)
                    .filter((key) => !key.endsWith("Label"))
                    .forEach((key) => {
                        let value = r[key].value;
                        if (
                            value.startsWith("http://www.wikidata.org/entity/")
                        ) {
                            let id = value.slice(
                                "http://www.wikidata.org/entity/".length
                            );
                            value = r[key + "Label"].value;
                            res[key] = new Tp.Value.Entity(id, value);
                        } else {
                            res[key] = value;
                        }
                    });
                return res;
            });
        });
    }
};
