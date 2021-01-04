// Author: James zhuang <james.zhuang@cs.stanford.edu>

const http = require("http");
const fs = require('fs').promises;

const host = 'localhost';
const port = 3000;

const requestListener = function (req, res) {
    fs.readFile("./index.html")
        .then(contents => {
            res.setHeader("Content-Type", "text/html");
            res.writeHead(200);
            res.end(contents);
        })
        .catch(err => {
            res.writeHead(500);
            res.end(err);
            return;
        });
};

const server = http.createServer(requestListener);
const io = require('socket.io')(server);


io.on('connection', (socket) => {
    console.log('a user connected: ' + socket.id.slice(0,5));

    //Clears dashboard
    socket.on('tp clear', (data) => {
        io.emit('clear', data);
    });

    //Display stock price chart
    socket.on('tp price', (data) => {
        console.log("Display stock chart: " + data.name);
        io.emit('price chart', data);
    });

    //Display earnings bar graph
    socket.on('tp earnings', (data) => {
        console.log("Display earnings: " + data.name);
        io.emit('earnings chart', data);
    });

    //Display revenue bar graph
    socket.on('tp revenue', (data) => {
        console.log("Display revenue: " + data.name);
        io.emit('revenue chart', data);
    });

    //Display operating profit bar graph
    socket.on('tp operating profit', (data) => {
        console.log("Display operating profit: " + data.name);
        io.emit('operating profit chart', data);
    });

    //Display gross profit bar graph
    socket.on('tp gross profit', (data) => {
        console.log("Display gross profit: " + data.name);
        io.emit('gross profit chart', data);
    });

    //Display pe ratio graph
    socket.on('tp pe', (data) => {
        console.log("Display PE ratio: " + data.name);
        io.emit('pe chart', data);
    });

    //Display ps ratio graph
    socket.on('tp ps', (data) => {
        console.log("Display P/S ratio: " + data.name);
        io.emit('price sales chart', data);
    });

    //Display market cap graph
    socket.on('tp market cap', (data) => {
        console.log("Display Market Cap: " + data.name);
        io.emit('market cap chart', data);
    });

    socket.on('disconnect', () => {
      console.log('user disconnected: ' + socket.id.slice(0,5));
    });
});

server.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
});
