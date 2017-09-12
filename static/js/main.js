$(document).ready(function() {
    let socket = io.connect(),
        room,
        playerTurn,
        hands;

    $("#start").on("click", () => {
        socket.emit("request_room")
        $("#start").toggle(400);
        $("#wait").toggle(400);
    })

    socket.on("end_wait", gameSetup => {
        $("#lounge").toggle(400);
        $("#board").toggle(400);
        hands = gameSetup.hands;
        playerTurn = gameSetup.firstTurn;
        loadCards();
        changeTurn();

        // playerTurn = gameSetup.firstTurn;
    })
    socket.on("game_cancelled", msg => {
        $("#wait").toggle(() => {
            $("#start").toggle(() => {
                $("#board").toggle(() => {
                    $("#lounge").toggle(() => {
                        alert(msg);
                    });
                });
            });
        });
    })

    socket.on("return_room", room_name => {
        console.log(" I am socket " + socket.id + " in room " + room_name);
        room = room_name;
    })

    function loadCards() {
        for (let i = 0; i < 5; i++) {
            $(".cp0" + i).text(hands[0][i].value)
            $(".cp0" + i).addClass(hands[0][i].suit)
        }
    }

    function changeTurn() {
        if (playerTurn) {
            $("#turn > h1:first-child").text("Your Turn! Play a Card or Give a Hint")
        } else {
            $("#turn > h1:first-child").text("Your Partner's Turn!")
        }
    }
})
