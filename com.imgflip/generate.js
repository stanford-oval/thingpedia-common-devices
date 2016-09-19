// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');

const DEFAULT_TEXT_TOP = {
    'One Does Not Simply': 'One does not simply',
    'Brace Yourselves X is Coming': 'Brace yourselves',
    'Y U NO': 'Y U NO',
    'Am I The Only One Around Here': 'Am I the only one around here',
    'Matrix Morpheus': 'What if I told you',
    'Back In My Day': 'back in my day'
};
const DEFAULT_TEXT_BOTTOM = {
    'That Would be Great': 'that would be great',
    'Aint Nobody Got Time For That': 'ain\'t nobody got time for that',
    'Aaaaand Its Gone': 'aaaaand it\'s Gone',
    'Pepperidge Farm Remembers': 'Pepperidge Farm remembers',
    'But Thats None Of My Business': 'But thats none of my business'
};

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
        var search = filters[0].toLowerCase().trim();
        var textTop = filters[1];
        var textBottom = filters[2];

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

            return Promise.all(memes.map((meme) => {
                var text0 = textTop.trim();
                var text1 = textBottom.trim();
                if (!text0 || text0 === '.')
                    text0 = DEFAULT_TEXT_TOP[meme.name];
                if (!text0)
                    text0 = '';
                if (!text1 || text1 === '.')
                    text1 = DEFAULT_TEXT_BOTTOM[meme.name];
                if (!text1)
                    text1 = meme.name;
                return Tp.Helpers.Http.post('https://api.imgflip.com/caption_image',
                                            'template_id=' + meme.id
                                            + '&username=thingengine&password=thingengine'
                                            + '&text0=' + encodeURIComponent(text0)
                                            + '&text1=' + encodeURIComponent(text1),
                                            { dataContentType: 'application/x-www-form-urlencoded' })
                .then((data) => {
                    var result = JSON.parse(data);
                    console.log('result', result);
                    return [filters[0], textTop, textBottom, meme.name, result.data.url];
                });
            }));
        });
    },
});
