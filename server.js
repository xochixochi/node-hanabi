var express = require("express");
var app = express();
var path = require("path");

app.use(express.static(path.join(__dirname, "./views")))
app.use(express.static(path.join(__dirname, "./static")))
// app.set("view engine", "ejs");
// app.set("views", path.join(__dirname, "./views"));

app.get("/", function(req, res) {
    res.sendFile(path.join(__dirname, "./views/lounge.html"));
})

var server = app.listen(7999, function() {
    console.log("Listening on Local Host 7999");
})

var io = require("socket.io").listen(server);
var namespaces = [{name: "/whiterabbit", users : 0 }, {name: "/redbear", users : 0 },{name: "/bluebelt", users : 0 }];

io.sockets.on("connection", function(socket) {
    console.log("socket is connected!");
    console.log("Client/socketID = " + socket.id);
    console.log(socket);

    socket.on("submitform", function (data){
        console.log("The server received this:")
        console.log(data)
        socket.emit("form_response", data);
    })
})


function Card(suit, value) {
    this.suit  = suit;
    this.value = value;
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
