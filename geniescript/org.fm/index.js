// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of org.fm
//
// Copyright 2021 Junwen <junwenz@stanford.edu>
//
// See LICENSE for details
"use strict";

// Library
// ===========================================================================
const Tp = require('thingpedia');
const fm_help = require("./fm_helpers");
const { MongoClient } = require('mongodb');


// Mongo helper functions
// ===========================================================================
async function connect_mongodb(uri) {
    const client = new MongoClient(uri);
    await client.connect();
    return client;
}

// Constants
// ===========================================================================
const DB_URL = 'mongodb+srv://user-2:DEPz9rt9ZZQfanKQ@cs224v.lpiun.mongodb.net/cs224v?retryWrites=true&w=majority';
const DB_NAME = 'building';
const OBJECT_COLLECTION = 'obj4';
const FLOOR_COLLECTION = 'floor1';
const defaul_forge_model_urn = '0c3b3e3f-eaf5-55d6-6d0d-5cead9d17655';


// Class Definition
// ===========================================================================

module.exports = class FacilityManageAPIDevice extends Tp.BaseDevice {
        
    constructor(engine, state) {
        super(engine, state);
        this._mongo_client = connect_mongodb(DB_URL);
    }

    // Retrieve building objects from Mongo DB
    // Input: 
    //      params
    //      hints
    //      env
    // Output: 
    //      list of dictionary
    //          [<key: value>, ...]    (key should be in manifest.tt, value should be in ThinkTalk Type)
    async get_building_object1(params, hints, env) {

        const client = await this._mongo_client;
        const db = client.db(DB_NAME);
        const collection = db.collection(OBJECT_COLLECTION);
        
        // Convert hints into Mongo Query
        const query = hints.filter !== undefined ? fm_help.thingtalkToMongo(hints.filter) : {};
        
        // Thingtalk will deal with projects; we provide all available data attributes from Mongo DB
        const projections = {};
        // const projections = hints.projection !== undefined ? fm_help.buildProjection(hints.projection) : {};
        // Ignore sort for now
        const sort = {};
        // const sort = hints.sort !== undefined ? fm_help.buildSort(hints.sort) : {};
        // Add filter for sorting on Date in Mongo DB
        // if (sort !== {}) {
        //     if (query['Installation Date'] === undefined)
        //         query['Installation Date'] = {};
        //     query['Installation Date']["$ne"] = ""; 
        //     query['Installation Date']["$exists"] = true; 
        // }

        // omit limit(Int); we do not limit the number of results from Mongo
        const limit = 0;  // a limit() value of 0 (i.e. .limit(0)) is equivalent to setting no limit.

        // console.log(query, projections, sort, limit);

        // Obtain Mongo results
        let cursor = collection.find(query).sort(sort).project(projections).limit(limit).collation({locale:'en', strength: 1}); 
        var query_objects = await cursor.toArray();
        await cursor.close(); 
        // console.log(query_objects);

        // Return results in the format of ThingTalk or an empty array
        if (query_objects.length === 0)
            return[];
        else
            return fm_help.mongoToThingtalk(query_objects);
    }

    // Retrieve forge floor model from Mongo DB
    // Input:
    //      floor: an object with typeof Tp.Value.Entity() E.g. {value: String, display: String}
    // Output: 
    //      a list with a signle object
    //          [{id: Tp.Value.Entity(value,display), floor, Tp.Value.Entity(value,display)}]
    // async get_forge_model({floor}){
    //     const result = {};
    //     if (!floor || isNaN(parseInt(floor.value))){
    //         // return default full building forge model if floor is not inputed
    //         result.id = new Tp.Value.Entity(defaul_forge_model_urn, defaul_forge_model_urn);
    //         result.floor = new Tp.Value.Entity("0", "full building");
    //     } else{
    //         const client = await this._mongo_client;
    //         const db = client.db(DB_NAME);
    //         const collection = db.collection(FLOOR_COLLECTION);
    //         const query = {"Floor" : parseInt(floor.value), "name": floor.display};
    //         let cursor = collection.find(query).collation({locale:'en', strength: 1});
    //         let query_objects = await cursor.toArray();
    //         await cursor.close();
    //         if (query_objects.length === 0){
    //             return[];
    //         }
    //         else{
    //             const model_urn = query_objects[0]['floor_value'];
    //             result.id = Tp.Value.Entity(model_urn, model_urn);
    //             result.floor = floor;
    //         }
    //     }
    //     return [result]; 
    // }

    async get_forge_model(params, hints, env){
        const result = {};
        const client = await this._mongo_client;
        const db = client.db(DB_NAME);
        const collection = db.collection(FLOOR_COLLECTION);
        
        const query = hints.filter !== undefined ? fm_help.thingtalkToMongo(hints.filter) : undefined;
        if (query === undefined){
            // return default full building forge model if floor is not inputed
            result.id = new Tp.Value.Entity(defaul_forge_model_urn, defaul_forge_model_urn);
            result.floor = new Tp.Value.Entity("0", "full building");
        } else{
            let cursor = collection.find(query).limit(1).collation({locale:'en', strength: 1});
            let query_objects = await cursor.toArray();
            await cursor.close();
            if (query_objects.length === 0){
                return[];
            }
            else{
                const model_urn = query_objects[0]['floor_value'];
                result.id = new Tp.Value.Entity(model_urn, model_urn);
                result.floor = new Tp.Value.Entity(String(query_objects[0]['Floor']), query_objects[0]['name']);
            }
        }
        return [result]; 
    }
};