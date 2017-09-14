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
var rooms = {};
var availableRoom;

io.sockets.on("connection", function(socket) {
    console.log("socket " + socket.id + " is connected!");
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
        console.log("socket disconnecting: " + socket.id );
        console.log("*****************");
        closeRoom(socket.id);
    })

    socket.on("give_hint", gameData => {
        let gameRoom = rooms[gameData.room],
            playerIdx = getPlayer(gameRoom, socket.id),
            otherPlayersHand = gameRoom.players[otherPlayerIdx(playerIdx)].hand;

        for (let card of otherPlayersHand) {
            if (card.suit === gameData.hint) {
                card.suitClue = true;
            } else if (card.value == gameData.hint) {
                card.valueClue = true;
            }
        }

        gameRoom.hints -= 1;
        io.to(socket.id).emit("end_turn", new ReturnData(gameRoom, playerIdx));
        io.to(gameRoom.players[otherPlayerIdx(playerIdx)].id).emit("end_turn", new ReturnData(gameRoom, otherPlayerIdx(playerIdx)));
    })

    socket.on("play_card", gameData => {
        let gameRoom = rooms[gameData.room],
            playerIdx = getPlayer(gameRoom, socket.id),
            card = gameRoom.players[playerIdx].hand[gameData.cardHandIdx],
            stackFound = false;
            suitFound = false;

        //Deal new card to replace played card
        gameRoom.players[playerIdx].hand[gameData.cardHandIdx] = gameRoom.deck.deal();
        for (let i = 0; i < gameRoom.fireworks.length; i++) {
            if (gameRoom.fireworks[i].suit === card.suit) {
                suitFound = true;

                if (gameRoom.fireworks[i].value === card.value - 1) {
                    stackFound = true;
                    console.log("you found the next higher card!!")
                    gameRoom.fireworks[i] = card;
                } else {
                    break;
                }
            }
        }
        if (!stackFound && !suitFound && card.value === 1) {
            gameRoom.fireworks.push(card);
            stackFound = true;
        } else {
            gameRoom.busts -= 1;
        }

        if (gameRoom.deck.length === 0 || gameRoom.busts === 0) {
            checkWin();
        } else {
            io.to(socket.id).emit("end_turn", new ReturnData(gameRoom, playerIdx));
            io.to(gameRoom.players[otherPlayerIdx(playerIdx)].id).emit("end_turn", new ReturnData(gameRoom, otherPlayerIdx(playerIdx)));
        }
    })

    socket.on("discard_card", gameData => {
        let gameRoom = rooms[gameData.room],
            playerIdx = getPlayer(gameRoom, socket.id)

        gameRoom.players[playerIdx].hand[gameData.cardHandIdx] = gameRoom.deck.deal();
        gameRoom.hints += 1;

        if (gameRoom.deck.length === 0) {
            checkWin();
        } else {
            io.to(socket.id).emit("end_turn", new ReturnData(gameRoom, playerIdx));
            io.to(gameRoom.players[otherPlayerIdx(playerIdx)].id).emit("end_turn", new ReturnData(gameRoom, otherPlayerIdx(playerIdx)));
        }
    })
})

//Returns the next available room or a new room and list of players to notify
function getRoom(socket_id) {
    let foundRoom;
    //If no room available, create new room and mark it available
    if (!availableRoom) {
        foundRoom = new Room();
        rooms[foundRoom.name] = foundRoom;
        availableRoom = foundRoom;
    } else {
    //Else fill availableRoom and mark it full
        foundRoom = availableRoom;
        availableRoom = undefined;
    }
    //Add Player to found room
    foundRoom.addPlayer(socket_id);
    return foundRoom;
}

//Finds player's game room and deletes it. Notifies other player in game room of deletion
function closeRoom(playerId) {
    for (let roomNumber in rooms) {
        disconnectedPlayer = getPlayer(rooms[roomNumber], playerId);
        console.log("the players index is " + disconnectedPlayer );
        if (disconnectedPlayer > -1) {
            if (rooms[roomNumber].isFull()) {
                console.log("room was full")
                io.to(rooms[roomNumber].players[Math.abs(disconnectedPlayer - 1)].id)
                    .emit("game_cancelled", "The other Player left the game");
            }
            delete rooms[roomNumber];
            console.log("room removed: " + roomNumber);
            return;
        }
    }
}

function startGame(room) {
    let firstPlayerSetup = {
            room: room.name,
            hands: [room.players[0].hand, room.players[1].hand],
            firstTurn: 0,
            deckSize: room.deck.deck.length
        },
        secondPlayerSetup = {
            room: room.name,
            hands: [room.players[1].hand, room.players[0].hand],
            firstTurn: 1,
            deckSize: room.deck.deck.length
        }
    io.to(room.players[0].id).emit("start_game", secondPlayerSetup);
    io.to(room.players[1].id).emit("start_game", firstPlayerSetup);
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

function checkWin() {

}

function otherPlayerIdx(playerIdx) {
    return Math.abs(playerIdx - 1);
}

class ReturnData {
    constructor(gameRoom, playerIdx) {
        this.room = gameRoom.name;
        this.busts = gameRoom.busts;
        this.hints = gameRoom.hints;
        this.deckSize = gameRoom.deck.deck.length;
        this.hands = [
            gameRoom.players[otherPlayerIdx(playerIdx)].hand,
            gameRoom.players[playerIdx].hand,
            gameRoom.fireworks
        ];
        this.gameOver = gameRoom.gameOver;
    }
}

class Room {
    constructor() {
        this.name = uuidv1();
        this.deck = new Deck();
        this.players = [];
        this.fireworks = [];
        this.hints = 8;
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
    constructor(playerId, deck) {
        this.id = playerId;
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
