"use strict";

const Tp = require('thingpedia');

module.exports = class FortniteDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'com.fortnitetracker';
        this.name = 'Fortnite Tracker';
        this.description = 'Keep updated with your and your friends\' Fortnite stats.';
    }

    get_get({ user_id }) {
        return Tp.Helpers.Http.get('https://api.fortnitetracker.com/v1/profile/pc/' + user_id, {
            extraHeaders: {'TRN-Api-Key': this.constructor.metadata.auth.api_key},
            accept: 'application/json'
        }).then((response) => {
            const parsed = JSON.parse(response);
            console.log(Object.keys(parsed));
            // p2: solo; p10: duo; p9: squad
            return [{
                rating: parsed.stats.curr_p2.trnRating.valueInt,
                rank: parsed.stats.curr_p2.trnRating.rank,
                kd: parsed.stats.curr_p2.kd.valueDec,
                winRatio: parsed.stats.curr_p2.winRatio.valueDec
            }];
        });
    }
};
