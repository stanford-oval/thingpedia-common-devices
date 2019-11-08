"use strict";

const assert = require('assert');

module.exports = [
    ['query', 'articles', { author: 'medium' }, (results) => {
        for (let result of results) {

            assert(result.title[0] === null || typeof result.title[0] === 'string');
            assert(result.link === null || result.link.startsWith('http'));
            assert(new Date(result.updated[0]) instanceof Date);
        }
        }]
];