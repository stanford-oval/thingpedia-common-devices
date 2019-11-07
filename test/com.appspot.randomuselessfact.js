"use strict";

const assert = require('assert');

module.exports = [
    ['query', 'random', {}, (results) => {
        for (let result of results) {
            assert(result.text === null || typeof result.text === 'string');
            assert(result.link === null || result.link.value.startsWith('http'));
        }
    }]
];
