var express = require("express");
var app = express();
var path = require("path");
var uuidv1 = require("uuid/v1");
var HOST = 8000

app.use(express.static(path.join(__dirname, "./views")))
app.use(express.static(path.join(__dirname, "./static")))

app.get("/", function(req, res) {
    res.sendFile(path.join(__dirname, "./views/lounge.html"));
})

var server = app.listen(HOST, function() {
    console.log("Listening on " + HOST);
})

var io = require("socket.io").listen(server);
var rooms = [];

io.sockets.on("connection", function(socket) {
    console.log("socket is connected!");
    console.log("Client/socketID = " + socket.id);
    //Join player to a game room and if the room is full notifies both players of game start
    socket.on("request_room", () => {
        room = getRoom(socket.id);
        socket.join(room.name);
        io.to(socket.id).emit("return_room", room.name);
        console.log("Socket " + socket.id + " Joined Room: " + room.name)
        if (room.isFull()) {
            startGame(room)
        }
    })
    //When User disconnects from Socket, close game room
    socket.on("disconnect", () => {
        console.log(socket.id);
        console.log("*****************");
        closeRoom(socket.id);
    })
})

//Returns the next available room or a new room and list of players to notify
function getRoom(socket_id) {
    let mostRecentRoom = rooms[rooms.length - 1],
        foundRoom;
    //If no room available, create new room
    if (!mostRecentRoom || mostRecentRoom.isFull()) {
        foundRoom = new Room();
        rooms.push(foundRoom);
    } else {
        foundRoom = mostRecentRoom;
    }
    //Add Player to room
    foundRoom.addPlayer(socket_id);
    return foundRoom;
}

//Finds player's game room and deletes it. Notifies any other players in game room of deletion
function closeRoom(playerId) {
    for (let roomNumber = 0; roomNumber < rooms.length; roomNumber++) {
        disconnectedPlayer = getPlayer(rooms[roomNumber], playerId)
        if (disconnectedPlayer > -1) {
            if (rooms[roomNumber].isFull()) {
                io.to(rooms[roomNumber].players[Math.abs(disconnectedPlayer - 1)].id)
                    .emit("game_cancelled", "The other Player left the game");
            }
            rooms.splice(roomNumber, 1);
            console.log("room removed******")
        }
    }
}

function startGame(room) {
    let firstPlayerSetup = {
            hands : [room.players[0].hand, room.players[1].hand],
            startTurn : 0,
        },
        secondPlayerSetup = {
            hands : [room.players[1].hand, room.players[0].hand],
            startTurn : 1
        }
    io.to(room.players[0].id).emit("end_wait", secondPlayerSetup);
    io.to(room.players[1].id).emit("end_wait", firstPlayerSetup);
}

function getPlayer(room, playerId) {
    if (room.players[0].id === playerId) {
        return 0
    }
    if (room.isFull() && room.players[1].id === playerId) {
        return 1
    }
    return -1
}

class Room {
    constructor() {
        this.name = uuidv1();
        this.deck = new Deck();
        this.players = [];
        this.guesses = 8;
        this.busts = 3;
    }
    newGame() {
        this.deck = reset();
        this.guesses = 8;
        this.busts = 3;
        this.players[0].newHand(this.deck);
        this.players[1].newHand(this.deck);
        return this;
    }
    addPlayer(id) {
        let newPlayer = new Player(id, this.deck);
        this.players.push(newPlayer);
        return this;
    }

    isFull() {
        return this.players.length === 2
    }
}

class Player {
    constructor(id, deck) {
        this.id = id;
        this.newHand(deck);
    }
    newHand(deck) {
        this.hand = [];
        for (let draw = 0; draw < 5; draw++) {
            this.hand.push(deck.deal());
        }
        return this;
    }
}

class Card {
    constructor(suit, value) {
        this.suit  = suit;
        this.value = value;
        this.suitClue = false;
        this.valueClue = false;
    }
}

class Deck {
    constructor() {
        this.reset().shuffle();
    }
    reset() {
        this.deck = [];
        let values = [1,1,1,2,2,3,3,4,4,5];
        let suits = ["Blue", "Red", "Green", "Black", "Yellow"];
        suits.forEach( suit => { values.forEach( value => { this.deck.push(new Card(suit, value)) }) })
        return this;
    }
    shuffle() {
        let unshuffledIndex = this.deck.length,
            temp,
            randomIndex;
        while (unshuffledIndex) {
            randomIndex = Math.floor(Math.random() * unshuffledIndex--);
            temp = this.deck[unshuffledIndex];
            this.deck[unshuffledIndex] = this.deck[randomIndex];
            this.deck[randomIndex] = temp;
        }
        return this;
    }
    deal() {
        return this.deck.pop();
    }
}
