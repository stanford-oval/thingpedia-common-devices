"use strict";

const assert = require('assert');
const Tp = require('thingpedia');

module.exports = [
    
    ['query', 'article', {}, {}, (result) => {
        console.log(result);
    }],

    ['query', 'article', {}, {
        filter: [
            ['date', '>=', new Date("2021-10-03")],
            ['date', '<=', new Date("2021-10-04")]
        ]
    }, (result) => {
        console.log(result);
    }]
];
