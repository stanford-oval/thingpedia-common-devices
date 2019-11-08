"use strict";

const assert = require('assert');

module.exports = [
    ['query', 'articles', { author: 'medium' }, (results) => {
        for (let result of results) {
            assert(result.title === null || typeof result.title === 'string');
            assert(result.link === null || result.link.startsWith('http'));
            assert(result.updated instanceof Date);
        }
    }]
];