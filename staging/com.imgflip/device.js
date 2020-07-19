// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2015 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details
"use strict";

const Tp = require('thingpedia');

const DEFAULT_TEXT_TOP = {
    '61579': 'One does not simply',
    '61546': 'Brace yourselves',
    '61527': 'Y U NO',
    '259680': 'Am I the only one around here',
    '100947': 'What if I told you',
    '718432': 'back in my day'
};
const DEFAULT_TEXT_BOTTOM = {
    '563423': 'that would be great',
    '442575': 'ain\'t nobody got time for that',
    '766986': 'aaaaand it\'s Gone',
    '1232104': 'Pepperidge Farm remembers',
    '16464531': 'But thats none of my business'
};

function findMeme(search) {
    if (/^[0-9]+$/.test(search))
        return Promise.resolve(search);

    return Tp.Helpers.Http.get('https://api.imgflip.com/get_memes').then((data) => {
        const parsed = JSON.parse(data);

        // find the meme
        // first we try an exact (case-insensitive match), then
        // we try a substring match

        let meme = null;
        for (let candidate of parsed.data.memes) {
            if (candidate.name.toLowerCase() === search.toLowerCase()) {
                meme = candidate;
                break;
            }
        }
        let memes = [];
        if (meme === null) {
            for (let candidate of parsed.data.memes) {
                if (candidate.name.toLowerCase().indexOf(search) >= 0)
                    memes.push(candidate);
            }
        } else {
            memes = [meme];
        }
        if (memes.length === 0)
            throw new Error('Could not find a meme matching your search.');
        if (memes.length > 1)
            throw new Error('Multiple memes match your search: ' + memes.map((m) => '"' + m.name + '"').join(', '));

        return memes[0].id;
    });
}

module.exports = class ImgflipDevice extends Tp.BaseDevice {
    constructor(engine, state) {
        super(engine, state);
        this.uniqueId = 'com.imgflip';
        this.name = "imgflip Meme Generator";
        this.description = "The Dankest Memes on the Internet, directly in your Almond";
    }

    get_generate({ template, text_top, text_bottom }) {
        return findMeme(String(template)).then((memeId) => {
            let text0 = text_top.trim();
            let text1 = text_bottom.trim();
            if (!text0 || text0 === '.')
                text0 = DEFAULT_TEXT_TOP[memeId];
            if (!text0)
                text0 = '';
            if (!text1 || text1 === '.')
                text1 = DEFAULT_TEXT_BOTTOM[memeId];
            return Tp.Helpers.Http.post('https://api.imgflip.com/caption_image',
                                        'template_id=' + memeId
                                        + '&username=thingengine&password=thingengine'
                                        + '&text0=' + encodeURIComponent(text0)
                                        + '&text1=' + encodeURIComponent(text1),
                                        { dataContentType: 'application/x-www-form-urlencoded' }).then((data) => {
                var result = JSON.parse(data);
                return [{ picture_url: result.data.url }];
            });
        });
    }

    get_list() {
        return Tp.Helpers.Http.get('https://api.imgflip.com/get_memes').then((data) => {
            const parsed = JSON.parse(data);
            return parsed.data.memes.map((meme) => {
                return { name: meme.name, picture_url: meme.url };
            });
        });
    }
};
