// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2018 Richard Yang <rry@stanford.edu>
//
// See COPYING for details
"use strict";

const Tp = require('thingpedia');
const STEAM_IDS = require('./steam_data.json');
const STORE_URL = 'http://store.steampowered.com/api/appdetails?appids=APP_ID&cc=us&filters=price_overview';
const API_ISteamUser_ResolveVanityURL = 'http://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=API_KEY&vanityurl=VANITY_URL';

module.exports = class Steam extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'com.steampowered';
        this.name = "Steam";
        this.description = "Integrate the Steam API with Almond.";
    }

    ///////////////////////////////////////
    // Begin Steam Community API Functions
    ///////////////////////////////////////
    get_get_steam_id({ name }){
        let url = API_ISteamUser_ResolveVanityURL;
        url = url.replace('VANITY_URL', name).replace('API_KEY', this.constructor.metadata.auth.api_key);
        return Tp.Helpers.Http.get(url).then((response) => {
            let parsed = JSON.parse(response);
            if(parsed["response"]["success"] === 1)
                return [{ id: parsed["response"]["steamid"]}];
            
            else 
                throw new Error("User not found");
            
        });
    }

    ///////////////////////////////////
    // Begin Steam Store API Functions
    ///////////////////////////////////
    get_get_price({ game_name }) {
        let app_id;
        if (isNaN(game_name)) {
            // App name is entered
            let app_name = game_name.toLowerCase().replace(/[^a-zA-Z0-9]+/g, "");
            if(app_name === 'halflife3')
                throw new Error("Can't make a bad game if you don't make the game. Half-Life 3 confirmed.");
            
            if(!Object.prototype.hasOwnProperty.call(STEAM_IDS, app_name))
                throw new Error("I couldn't find a Steam app with that name. Check your spelling or try entering the ID instead.");
            
            app_id = STEAM_IDS[app_name];
        } else {
            // App ID is entered
            app_id = game_name;
        }

        let url = STORE_URL.replace("APP_ID", app_id);
        return Tp.Helpers.Http.get(url).then((response) => {
            let parsed = JSON.parse(response);
            if ("price_overview" in parsed[app_id]["data"])
                return [{ price: parsed[app_id]["data"]["price_overview"]["final"]/100 }];
            return [{ price: 0 }];
        });

    }



};
