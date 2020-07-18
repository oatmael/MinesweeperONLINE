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
            revealTile(jsonMessage.x, jsonMessage.y);
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
let board;
let visibleBoard;
function generateGameBoard(numMines, width, height){
    board = new Array(Number(width)).fill(0).map(()=>new Array(Number(height)).fill(0));
    visibleBoard = new Array(Number(width)).fill(-1).map(()=>new Array(Number(height)).fill(-1));

    //console.log(board);

    for (let i = 0; i < numMines; i++){
        let x = Math.floor(Math.random() * width);
        let y = Math.floor(Math.random() * height);
        if (board[y][x] === 1){
            i--;
        } else {
            board[y][x] = 1;
        }
    }
}
generateGameBoard(20, 10, 10);

function revealTile(x,y){
    x = Number(x);
    y = Number(y);
    
    if (board[y][x] === 1){
        lost = true;
        loseGame();
    } else if (visibleBoard[y][x] === -1) {
        numMines = 0;
        for (let j = Math.max(y-1, 0); j <= Math.min(y+1, board.length); j++){
            for (let i = Math.max(x-1, 0); i <= Math.min(x+1, board[0].length); i++){
                if (board[j][i] === 1){
                    numMines++;
                } 
            }
        }
        visibleBoard[y][x] = numMines;
        console.log("tile revealed: " + x + "," + y + ": " + numMines);
        broadcast({
            "message":"gameBoard",
            "value":visibleBoard
        });
        if (numMines === 0) {
            for (let i = Math.max(x-1, 0); i <= Math.min(x+1, board[0].length); i++){
                for (let j = Math.max(y-1, 0); i <= Math.min(y+1, board[0].length); j++){
                    revealTile(i,j);
                }
            }
        }
    }
}

function loseGame(){
    for (let y = 0; y < board.length; y++){
        for (let x = 0; x < board[0].length; x++){
            if (board[x][y] === 1){
                visibleBoard[x][y] = -2;
            }
        }
    }
}

function broadcast(jsonToSend) {
    clients.forEach(client => {
        client.sendUTF(JSON.stringify(jsonToSend));
    });
}

