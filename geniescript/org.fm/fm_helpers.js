"use strict";

// Library
// ===========================================================================
const Tp = require('thingpedia');

// Constants
// ===========================================================================

const e2int = function (op, value){
    if (op === "==") {
        const v = isNaN(value['value']) ? null : parseInt(value['value']);
        const a = isNaN(value['display']) ? null : parseInt(value['display']);
        return v || a || null;
    } else if(op === "=~"){
        const a = isNaN(value) ? null : parseInt(value);
        return a;
    } else if(op === "in_array" || op === "in_array~"){
        // why in_array/in_array~ do not exist in synthetic data set ???
        let num_values = value.map((val) => {
            const v = isNaN(value['value']) ? null : parseInt(value['value']);
            const a = isNaN(value['display']) ? null : parseInt(value['display']);
            return v || a || null;
        });
        return {"$in": num_values};
    } else{
        return null;
    }
};

const e2str = function (op, value){
    if (op === "==") {
        // value is an object with typeof Tp.Value.Entity() E.g. {value:"...", display:"..."}
        return value['value'];
    } else if(op === "=~"){
        return {"$regex":value['value']};
    } else if(op === "in_array"){
        // value is an array of Tp.Value.Entity()
        let num_values = value.map((val) => val['value']);
        return {"$in": num_values};
    } else if(op === "in_array~"){
        // TO BE tested in Mongo
        let num_values = value.map((val) => {
            return val['value'];
        });
        return {"$regex": num_values};
    } else{
        return null;
    }
};

const ttstr2str = function(op, value){
    if (op === "==" || op === "=~")
        return value;
    else if (op === "in_array" || op === "in_array~") 
        return {"$in": value};
    else
        return null;
};

// This is "Asset" only because of database attribute
const b2str = function(op, value){
    if (op === "==" && value === true) 
        return "Asset";
    else
        return null;
};

const ae2astr = function (op, value) {
    if (op === "contains"){
        return {"$in": [value['value']]};
    } else if(op === "contains~"){
        // value is an array of String for soft matching
        let num_values = value.map((val) => {
            '/' + val + '/';
        });
        return {"$in": num_values};
    } else{
        return null;
    }
};

const int2e = function(db_result){
    return new Tp.Value.Entity(String(db_result),String(db_result));
};

const int2floor = function(db_result){
    return new Tp.Value.Entity(String(db_result), floor_dic[db_result]);
};

const str2e = function(db_result){
    return new Tp.Value.Entity(db_result, db_result.toLowerCase());
};

const str2ttstr = function(db_result){
    return db_result.toLowerCase();
};

// This is "Asset" only because of database
const str2b = function(db_result){
    if (db_result === "Asset")
        return true;
    else
        return false;
};

const astr2ae = function(db_result){
    // some bld objs have [""] in "System Classification"
    var num_values = [];
    for(let v of db_result){
        if (v.length >0)
            num_values.push(new Tp.Value.Entity(v, v.toLowerCase()));
    }
    return num_values;
};

// floor entity dictionary for display
const floor_dic = {
    1:"first floor", 2:"second floor", 3:"third floor", 
    4:"fourth floor", 5:"fifth floor", 6:"sixth floor"
};

// Dictionary for ThingTalk, MongDB schema
const tt2mdb = {
    "id" : {"db":"objectid", "t2m":e2int},
    "room_id" : {"db":"Room Name", "t2m":e2int},
    "floor" : {"db":"Floor", "t2m":e2int},

    "manufacturer" : {"db":"Manufacturer", "t2m":e2str},
    "obj_type" : {"db":"Type", "t2m":e2str},
    "room_type" : {"db":"Room Type", "t2m":e2str},

    "asset_tag" : {"db":"Asset Tag", "t2m":b2str},
    "model" : {"db":"Model", "t2m":ttstr2str},
    "equip_spec" : {"db":"Equip Spec", "t2m":ttstr2str},

    "bld_system" : {"db":"System Classification", "t2m":ae2astr},
    "system_name" : {"db":"System Name", "t2m":ae2astr}
};

const mdb2tt = {
    "objectid" : {"tt":"id", "m2t":int2e},
    "Room Name" : {"tt":"room_id", "m2t":int2e},

    "Floor" : {"tt":"floor",  "m2t":int2floor},

    "Manufacturer" : {"tt":"manufacturer",  "m2t":str2e},
    "Type" : {"tt":"obj_type", "m2t":str2e},
    "Room Type" : {"tt":"room_type", "m2t":str2e},

    "Asset Tag" : {"tt":"asset_tag", "m2t":str2b},
    "Model" : {"tt":"model", "m2t":str2ttstr},
    "Equip Spec" : {"tt":"equip_spec", "m2t":str2ttstr},

    "System Classification" : {"tt":"bld_system", "m2t":astr2ae},
    "System Name" : {"tt":"system_name", "m2t":astr2ae}
};

// Build Mongo DB query from Thingtalk filter
function thingtalkToMongo(filter) {
    const query = {};
    for (let [name, op, value] of filter) {
        console.log("name: ", name, " op: ", op," value: ", value);
        query[tt2mdb[name]['db']] = tt2mdb[name]['t2m'](op, value);
    }
    return query;
}

// Build ThinkTalk from Mongo query results
function mongoToThingtalk(query_objects){
    var results = [];
    // console.log("query objects: ", query_objects);
    for (let object of query_objects){
        const data = {};
        Object.keys(object).forEach((key) => {
            if (Object.keys(mdb2tt).includes(key)){
                if (object[key] !== '')
                    data[mdb2tt[key]['tt']] = mdb2tt[key]['m2t'](object[key]);
            }
            // else
                // console.log(key);
        });
        results.push(data);
    }
    // console.log("first item of results: ", results[0]);
    return results;
}

module.exports = {thingtalkToMongo, mongoToThingtalk};