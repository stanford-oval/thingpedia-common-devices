// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// This file is part of ThingEngine
//
// Copyright 2018 Richard Yang <rry@stanford.edu>
//
// See COPYING for details
"use strict";

const Tp = require('thingpedia');
const STEAM_IDS = require('./steam_data.json')
const STORE_URL = 'http://store.steampowered.com/api/appdetails?appids=APP_ID&cc=us&filters=price_overview'
const API_ISteamUser_ResolveVanityURL = 'http://api.steampowered.com/ISteamUser/ResolveVanityURL/v0001/?key=97D01EA33FA2A7F89EDED533E6FBFF90&vanityurl=VANITY_URL'
const API_IPlayerService_GetOwnedGames = 'https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=97D01EA33FA2A7F89EDED533E6FBFF90&steamid=USER_ID'
const API_IPlayerService_GetRecentlyPlayedGames = 'https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/?key=97D01EA33FA2A7F89EDED533E6FBFF90&format=json&steamid=USER_ID&count='

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
        let url = API_ISteamUser_ResolveVanityURL
        url = url.replace('VANITY_URL', name)
        return Tp.Helpers.Http.get(url).then((response) => {
            var parsed = JSON.parse(response);
            if(parsed["response"]["success"] == 1){
                var out = "Your Steam ID is: " + parsed["response"]["steamid"]
                return [{ name, output: out}];
            }
            else {
                var out = "I couldn't find a Steam ID under that name."
                return [{ name, output: out}];
            }
        });
    }

    get_get_games({ id }){
        let url = API_IPlayerService_GetOwnedGames
        url = url.replace('USER_ID', id)
        return Tp.Helpers.Http.get(url).then((response) => {
            var parsed = JSON.parse(response);
            var out = "You own " + parsed["response"]["game_count"] + " games."
            return [{ id, output: out}]
        });
    }

    get_get_recent_games({ id }){
        let url = API_IPlayerService_GetRecentlyPlayedGames
        url = url.replace('USER_ID', id)
        return Tp.Helpers.Http.get(url).then((response) => {
            var parsed = JSON.parse(response);
            var out = "You played " + parsed["response"]["total_count"] + " games in the last two weeks. "
            var i;
            for (i=0; i < parsed["response"]["total_count"]; i++) {
                out += "You played " + parsed["response"]["games"][i]["name"] + " for " + parsed["response"]["games"][i]["playtime_2weeks"] + " minutes. "
            }
            return [{ id, output: out}]
        });
    }
    ///////////////////////////////////
    // Begin Steam Store API Functions
    ///////////////////////////////////
    get_get_price({ game_name }) {
        let url = STORE_URL;
        if (isNaN(game_name)) {
            // App name is entered
            var app_name = game_name.toLowerCase().replace(/[^a-zA-Z0-9]+/g, "")
            if(app_name === 'halflife3'){
                return [{game_name, price: "Can't make a bad game if you don't make the game. Half-Life 3 confirmed."}]
            }
            if(!STEAM_IDS.hasOwnProperty(app_name)){
                return [{game_name, price: "I couldn't find a Steam app with that name. Check your spelling or try entering the ID instead."}]
            }
            else{
                var app_id = STEAM_IDS[app_name]
                url = url.replace("APP_ID", app_id)
                return Tp.Helpers.Http.get(url).then((response) => {
                    var parsed = JSON.parse(response);
                    var out = "The price of " + game_name + " is currently $" + parsed[app_id]["data"]["price_overview"]["final"]/100 + "."
                    if (parsed[app_id]["data"]["price_overview"]["discount_percent"] > 0) {
                        out = out + " It is currently " + parsed[app_id]["data"]["price_overview"]["discount_percent"] + "% off from its normal price."
                    }
                    return [{ game_name, price: out }];
                });
            }
        }
        else {
            // App ID is entered
            url = url.replace("APP_ID", game_name)
            return Tp.Helpers.Http.get(url).then((response) => {
                var parsed = JSON.parse(response);
                var out = "The price of " + game_name + " is currently $" + parsed[game_name]["data"]["price_overview"]["final"]/100 + "."
                if (parsed[game_name]["data"]["price_overview"]["discount_percent"] > 0) {
                    out = out + " It is currently " + parsed[game_name]["data"]["price_overview"]["discount_percent"] + "% off from its normal price."
                }
                return [{ game_name, price: out }];
            });
        }

    }



};
