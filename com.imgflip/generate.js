// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

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
    if (/^[0-9]+$/.test(search)) {
        const memes = require('./memes.json');
        return Promise.resolve([search, memes[search] || '']);
    }

    return Tp.Helpers.Http.get('https://api.imgflip.com/get_memes').then((data) => {
        var parsed = JSON.parse(data);

        // find the meme
        // first we try an exact (case-insensitive match), then
        // we try a substring match

        var meme = null;
        for (var candidate of parsed.data.memes) {
            if (candidate.name.toLowerCase() === search) {
                meme = candidate;
                break;
            }
        }
        var memes = [];
        if (meme === null) {
            for (var candidate of parsed.data.memes) {
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

        return [memes[0].id, memes[0].name];
    });
}

module.exports = new Tp.ChannelClass({
    Name: 'ImgflipListChannelDevice',

    formatEvent(event) {
        var search = event[0];
        var textTop = event[1];
        var textBottom = event[2];
        var name = event[3];
        var url = event[4];

        return [{ type: 'picture', url: url }];
    },

    invokeQuery(filters) {
        var search = String(filters[0]).toLowerCase().trim();
        var textTop = filters[1];
        var textBottom = filters[2];

        return findMeme(search).then(([memeId, memeName]) => {
            var text0 = textTop.trim();
            var text1 = textBottom.trim();
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
                console.log('result', result);
                return [[filters[0], textTop, textBottom, memeName, result.data.url]];
            });
        });
    },
});
