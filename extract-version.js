#!/usr/bin/node

const fs = require('fs');

function main(args) {
    var fileName = args[2].substr(0, args[2].length-4) + '/package.json';
    var packageJson = JSON.parse(fs.readFileSync(fileName));
    var version = packageJson.version.split('.').map(function(x) { return parseInt(x); });
    process.stdout.write(String(version[0] * 100 + version[1]) + '\n');
}
main(process.argv);
