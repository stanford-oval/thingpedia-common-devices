const fs = require('fs');

const jsonString = fs.readFileSync("./config.json");
console.log(JSON.parse(jsonString));
