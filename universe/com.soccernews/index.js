"use strict";

const Tp = require('thingpedia');

module.exports = class NewsDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'com.soccernews';
        this.name = 'SoccerNews';
        this.description = 'Keep up with the latest in soccer';
    }

    get_standings() {
        return Tp.Helpers.Http.get('https://real-time-football-content.p.rapidapi.com/football?langs=en&limit=10&skip=0', {
            extraHeaders: {
                'x-rapidapi-key': this.constructor.metadata.auth.api_key,
                'x-rapidapi-host': 'real-time-football-content.p.rapidapi.com',
                useQueryString: true
            },
            accept: 'application/json'
        }).then((tempResponse) => {
            const a = JSON.parse(tempResponse);
            return a.map((obj) => {
                const t = obj.title;
                console.log(t);
                const u = obj.url;
                const d = obj.description;
                const s = obj.source;

                return ({
                    title: t,
                    summary: d,
                    source: s,
                    url: u
                });
            });

        });
    }
};

