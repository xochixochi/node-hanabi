var express = require("express");
var app = express();
var path = require("path");
var uuidv1 = require("uuid/v1");

app.use(express.static(path.join(__dirname, "./views")))
app.use(express.static(path.join(__dirname, "./static")))

app.get("/", function(req, res) {
    res.sendFile(path.join(__dirname, "./views/lounge.html"));
})

var server = app.listen(7999, function() {
    console.log("Listening on Local Host 7999");
})

var io = require("socket.io").listen(server);
var rooms = [];

io.sockets.on("connection", function(socket) {
    console.log("socket is connected!");
    console.log("Client/socketID = " + socket.id);
    socket.on("request_room", () => {
        roomName = getRoom(socket.id);
        socket.join(roomName);
        io.to(socket.id).emit("return_room", roomName);
    })
    socket.on("disconnect", () => {
        console.log(socket.id);
        console.log("*****************");
        removeFromGame(socket.id);
    })
})

function getRoom(socket_id) {
    for (let h = 0; h < rooms.length; h++) {
        if (rooms[h].players.length < 2) {
            console.log(rooms[h]);
            rooms[h].newPlayer(socket_id);
            io.to(rooms[h].players[0].id).emit("end_wait");
            io.to(socket_id).emit("end_wait");
            return rooms[h].name;
        }
    }
    let newRoom = new Room();
    rooms.push(newRoom.newPlayer(socket_id));
    return newRoom.name;
}

function removeFromGame(socket_id) {
    for (let h = 0; h < rooms.length; h++) {
        if (rooms[h].players[0].id === socket_id) {
            if (rooms[h].players.length === 2) {
                io.to(rooms[h].players[1].id).emit("game canceled", "The other Player left the game");
            }
            rooms.splice(h, 1);
            console.log("room removed******")
        } else if (rooms[h].players.length === 2) {
            if (rooms[h].players[1].id === socket_id) {
                // console.log("informing " + rooms[h].player[0].id);
                if (rooms[h].players.length === 2) {
                    io.to(rooms[h].players[0].id).emit("game canceled", "The other Player left the game");
                }
                rooms.splice(h, 1);
                console.log("room removed*****")
            }
        }
    }
}

function Room() {
    this.name = uuidv1();
    this.deck = new Deck();
    this.players = [];
    this.guesses = 8;
    this.busts = 3;

    this.newGame = () => {
        this.deck = reset();
        this.guesses = 8;
        this.busts = 3;
        this.players[0].hand = newHand();
        this.players[1].hand = newHand();
        return this;
    }

    this.newPlayer = id => {
        let newPlayer = {
            "id" : id,
            "hand" : this.newHand()
        }
        this.players.push(newPlayer);
        return this;
    }

    this.newHand = () => {
        let hand = [];
        for(let draw = 0; draw < 5; draw++) {
            hand.push(this.deck.deal());
        }
        return hand;
    }
}

function Card(suit, value) {
    this.suit  = suit;
    this.value = value;
    this.suitClue = false;
    this.suitClue = false;
}

function Deck() {
    this.deck;

    this.reset = () => {
        this.deck = [];
        let values = [1,1,1,2,2,3,3,4,4,5];
        let suits = ["Blue", "Red", "Green", "White", "Yellow"];
        suits.forEach( suit => { values.forEach( value => { this.deck.push(new Card(suit, value)) }) })
        return this;
    }
    this.shuffle = () => {
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
    this.deal = () => {
        return this.deck.pop();
    }
    this.reset().shuffle();
}
