// -*- mode: js; indent-tabs-mode: nil; js-basic-offset: 4 -*-
//
// Copyright 2016 Christopher Salvarani <csal@stanford.edu>
//                Giovanni Campagna <gcampagn@cs.stanford.edu>
//
// See LICENSE for details

const Tp = require('thingpedia');
const xml2js = require('xml2js');

const PREV_REGEXP = /<a\s+rel="prev"\s+href="(?:#|\/([0-9]+)\/)?"/;
const IMG_REGEXP = /<img\s+src="((?:https?:)?\/\/imgs\.xkcd\.com\/comics\/[A-Za-z0-9_]+\.(?:png|jpg|jpeg))"\s+title="([^"]+)"\s+alt="([^"]+)"/;

function parseXml(data) {
    return new Promise(function(callback, errback) {
        xml2js.parseString(data, function(err, res) {
            if (err)
                errback(err);
            else
                callback(res);
        });
    });
}

module.exports = function(name, url) {
    return new Tp.ChannelClass({
        Name: name,

        formatEvent(event) {
            var number = event[0];
            var link = 'http://xkcd.com/' + number;
            var title = event[1];
            var picture = event[2];
            var alt = event[3];

            return [title, { type: 'picture', url: picture }, alt, link];
        },

        invokeQuery(filters) {
            return Tp.Helpers.Http.get(url(filters)).then(function(response) {
                // the response is HTML, which we can't easily parse as XML
                // (there are invalid entities here and there)

                var aMatch = PREV_REGEXP.exec(response);
                var imgMatch = IMG_REGEXP.exec(response);
                if (imgMatch === null || aMatch === null)
                    throw new Error('Failed to scrape XKCD');

                var number;
                if (aMatch[1] === undefined)
                    number = 1;
                else
                    number = parseInt(aMatch[1])+1;
                return Promise.all([number, imgMatch[1],
                    // wrap in XML and parse to resolve entities (and hope for the best...)
                    parseXml('<foo>' + imgMatch[2] + '</foo>'),
                    parseXml('<foo>' + imgMatch[3] + '</foo>')]);
            }).then(function(result) {
                var number = result[0];
                var url = result[1];
                if (!url.startsWith('http'))
                    url = 'http:' + url;
                // note: here altText has the xkcd meaning (ie,
                // the popover text), but the HTML attributes are swapped!
                var altText = result[2].foo;
                var title = result[3].foo;

                return [[number, title, url, altText]];
            });
        }
    });
}
