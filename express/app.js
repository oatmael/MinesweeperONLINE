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
const e = require("express");
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
                "value":cleanChars(jsonMessage.value)
            });
            connection.sendUTF(JSON.stringify({
                "message":"gameBoard",
                "value":visibleBoard
            }));
            break;
        case "newGame":
            generateGameBoard(jsonMessage.numMines, jsonMessage.width, jsonMessage.height, jsonMessage.uid);
            broadcast({
                "message":"gameBoard",
                "value":visibleBoard
            });
            break;
        case "revealTile":
            revealTile(jsonMessage.x, jsonMessage.y, jsonMessage.uid);
            break;
        case "markBomb":
            markBomb(jsonMessage.x, jsonMessage.y, jsonMessage.uid);
            broadcast({
                "message":"gameBoard",
                "value":visibleBoard
            });
            break;
        case "chat":
            broadcast({
                "message":cleanChars(jsonMessage.uid),
                "value":cleanChars(jsonMessage.value)
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
        broadcast({
            "message":"userDisconnect",
            "value":" a client disconnected"
        });
    });
});

let lost = false;
let won = false;
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
    "grid": [],
    "won":false
};

function generateGameBoard(numMines, width, height, uid){
    lost = false;
    won = false;

    if (isNaN(numMines) || isNaN(width) || isNaN(height)){
        return;
    }

    if (numMines < 0 || numMines > (width * height)){
        numMines = width * height;
    }

    board.grid = new Array(Number(height)).fill(0).map(()=>new Array(Number(width)).fill(0));
    visibleBoard.grid = new Array(Number(height)).fill(-1).map(()=>new Array(Number(width)).fill(-1));

    board.width = Math.round(Number(width));
    visibleBoard.width = Math.round(Number(width));
    board.height = Math.round(Number(height));
    visibleBoard.height = Math.round(Number(height));
    board.mines = Math.round(numMines);
    visibleBoard.mines = Math.round(numMines);
    visibleBoard.won = false;
    

    for (let i = 0; i < numMines; i++){
        let x = Math.floor(Math.random() * width);
        let y = Math.floor(Math.random() * height);
        if (board.grid[y][x] === 1){
            i--;
        } else {
            board.grid[y][x] = 1;
        }
    }

    broadcast({
        "message":"User " + cleanChars(uid) + " Created New Game: ",
        "value":width + " * " + height + ", " + numMines + " mines"
    });
    console.log(board);
}
generateGameBoard(20, 10, 10, "system");

function revealTile(x,y,uid){
    x = Number(x);
    y = Number(y);
    
    if (board.grid[y][x] === 1 && visibleBoard.grid[y][x] !== -3){
        loseGame();
    } else if (visibleBoard.grid[y][x] === -1) {
        let numMines = 0;
        for (let j = Math.max(y-1, 0); j <= Math.min(y+1, board.height - 1); j++){
            for (let i = Math.max(x-1, 0); i <= Math.min(x+1, board.width - 1); i++){
                //console.log("Checking position: " + i + "," + j + " for mines")
                if (board.grid[j][i] === 1){
                    numMines++;
                } 
            }
        }
        //console.log("Mines revealed: " + numMines);
        visibleBoard.grid[y][x] = numMines;
        //console.log("tile revealed: " + x + "," + y + ": " + numMines);
        broadcast({
            "message":"User " + cleanChars(uid) + " Revealed Tile: ",
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
            if (visibleBoard.mines === 0){
                checkWinGame();
            }
            return;
        }
        
    }
}

function markBomb(x,y,uid){
    if (visibleBoard.grid[y][x] === -1) {
        visibleBoard.mines--;
        visibleBoard.grid[y][x] = -3;

        broadcast({
            "message":"User " + cleanChars(uid) + " Marked Tile: ",
            "value":x + "," + y
        });

        checkWinGame();
    } else if (visibleBoard.grid[y][x] === -3 && !won) {
        visibleBoard.mines++;
        visibleBoard.grid[y][x] = -1;

        broadcast({
            "message":"User " + cleanChars(uid) + " Unmarked Tile: ",
            "value":x + "," + y
        });
    }
}

function checkWinGame(){
    if (!lost) {
        if (!visibleBoard.grid.some(row => row.includes(-1))){
            won = true;
            visibleBoard.won = true;
            broadcast({
                "message":"gameWin",
                "value":"You've won the game!"
            });
            broadcast({
                "message":"gameBoard",
                "value":visibleBoard
            });
        }
    }
}

function loseGame(){
    if (!lost){
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
        broadcast({
            "message":"gameLoss",
            "value":"You've lost the game!"
        });
    }
    
    lost = true;
}

function cleanChars(string) {
    if (!string){
        return;
    }
    const dirty = /([<>\/='";])/igm;
    return string.replace(dirty, "");
}

function broadcast(jsonToSend) {
    clients.forEach(client => {
        client.sendUTF(JSON.stringify(jsonToSend));
    });
}

