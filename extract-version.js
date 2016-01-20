#!/usr/bin/node

const fs = require('fs');

function main(args) {
    var fileName = args[2].substr(0, args[2].length-4) + '/package.json';
    var packageJson = JSON.parse(fs.readFileSync(fileName));
    var version = parseInt(packageJson['thingpedia-version']);
    process.stdout.write(version + '\n');
}
main(process.argv);
