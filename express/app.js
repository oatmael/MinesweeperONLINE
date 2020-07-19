const express = require("express");
const app = express();
const router = express.Router();

const path = __dirname + "/views/";
const port = 80;


router.use((req,res,next) => {
    console.log('/' + req.method);
    next();
});

router.get('/', (req,res,next) => {
    res.sendFile(__dirname + "/client.html")
});

app.use(express.static(path));
app.use('/', router);

app.listen(port, () => {
    console.log('Express app running');
});

// Node.js WebSocket server script
const http = require('http');
const WebSocketServer = require('websocket').server;
const server = http.createServer();
server.listen(9898);

const wsServer = new WebSocketServer({
    httpServer: server
});

var clients = [];
wsServer.on('request', function(request) {
    var connection = request.accept(null, request.origin);
    clients.push(connection);

    connection.on('message', function(message) {
      console.log('Received Message:', message.utf8Data);
      var jsonMessage = JSON.parse(message.utf8Data);
    
      switch (jsonMessage.message) {
        case "connect":
            broadcast({
                "message":"clientConnected",
                "value":jsonMessage.value,
            });
            connection.sendUTF(JSON.stringify({
                "message":"gameBoard",
                "value":visibleBoard
            }));
            break;
        case "newGame":
            generateGameBoard(jsonMessage.numMines, jsonMessage.width, jsonMessage.height);
            broadcast({
                "message":"gameBoard",
                "value":visibleBoard
            });
            break;
        case "revealTile":
            revealTile(jsonMessage.x, jsonMessage.y, jsonMessage.uid);
            break;
        case "chat":
            broadcast({
                "message":jsonMessage.uid,
                "value":jsonMessage.value
            });
            break;
        default:
            broadcast({
                "message":"???",
                "value":jsonMessage
            });
      } 
    });

    connection.on('close', function(reasonCode, description) {
        console.log('Client has disconnected.');
    });
});

let lost = false;
let board = {
    "width":0,
    "height":0,
    "mines":0,
    "grid": []
};
let visibleBoard = {
    "width":0,
    "height":0,
    "mines":0,
    "grid": []
};

function generateGameBoard(numMines, width, height){
    board.grid = new Array(Number(height)).fill(0).map(()=>new Array(Number(width)).fill(0));
    visibleBoard.grid = new Array(Number(height)).fill(-1).map(()=>new Array(Number(width)).fill(-1));

    board.width = Number(width);
    visibleBoard.width = Number(width);
    board.height = Number(height);
    visibleBoard.height = Number(height);
    board.mines = numMines;
    visibleBoard.mines = numMines;
    

    for (let i = 0; i < numMines; i++){
        let x = Math.floor(Math.random() * width);
        let y = Math.floor(Math.random() * height);
        if (board.grid[y][x] === 1){
            i--;
        } else {
            board.grid[y][x] = 1;
        }
    }

    console.log(board);
}
generateGameBoard(20, 10, 10);

function revealTile(x,y,uid){
    x = Number(x);
    y = Number(y);
    
    if (board.grid[y][x] === 1){
        lost = true;
        loseGame();
    } else if (visibleBoard.grid[y][x] === -1) {
        let numMines = 0;
        for (let j = Math.max(y-1, 0); j <= Math.min(y+1, board.height - 1); j++){
            for (let i = Math.max(x-1, 0); i <= Math.min(x+1, board.width - 1); i++){
                console.log("Checking position: " + i + "," + j + " for mines")
                if (board.grid[j][i] === 1){
                    numMines++;
                } 
            }
        }
        console.log("Mines revealed: " + numMines);
        visibleBoard.grid[y][x] = numMines;
        //console.log("tile revealed: " + x + "," + y + ": " + numMines);
        broadcast({
            "message":"User " + uid + " Revealed Tile: ",
            "value":x + "," + y
        });
        broadcast({
            "message":"gameBoard",
            "value":visibleBoard
        });
        if (visibleBoard.grid[y][x] === 0) {
            for (let j = Math.max(y-1, 0); j <= Math.min(y+1, visibleBoard.height - 1); j++){
                for (let i = Math.max(x-1, 0); i <= Math.min(x+1, visibleBoard.width - 1); i++){
                    revealTile(i,j,uid);
                }
            }
        } else {
            return;
        }
    }
}

function loseGame(){
    for (let y = 0; y < board.height; y++){
        for (let x = 0; x < board.width; x++){
            if (board.grid[y][x] === 1){
                visibleBoard.grid[y][x] = -2;
            }
        }
    }
    broadcast({
        "message":"gameBoard",
        "value":visibleBoard
    });
}

function broadcast(jsonToSend) {
    clients.forEach(client => {
        client.sendUTF(JSON.stringify(jsonToSend));
    });
}

