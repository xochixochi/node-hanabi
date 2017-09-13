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
        loadP0Cards();
        changeTurnDisplay();
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

    socket.on("new_hands", newHands => {
        playerTurn = Math.abs(playerTurn - 1)
        // console.log()
        hands = newHands;
        loadP0Cards();
        loadP1Cards();
        changeTurnDisplay();
        console.log("New hands have arrived")
    })

    $(".colorHint").hover(function() {
        if(playerTurn) {
            let color = $(this).siblings('p').get(0).className
            for (let i = 0; i < 5; i++) {
                if ($("#cp0" + i).get(0).className === color) {
                    $("#cp0" + i).siblings(".colorHint").css({"background-color" : color, "width" : "18px", "height" : "18px"})
                    $("#cp0" + i).parent().css("background-color", "#47477E")
                }
            }
        }
    }, function() {
        for (let i = 0; i < 5; i++) {
            if (!hands[0][i].suitClue) {
                $("#cp0" + i).siblings(".colorHint").css("background-color", "buttonface")
            }
            $("#cp0" + i).parent().css("background-color", "white")
        }
    })

    $(".colorHint").click(function() {
        if(playerTurn) {
            socket.emit("give_hint", {hint: $(this).siblings('p').get(0).className, room: room})
        }
    })

    $(".valueHint").hover(function() {
        if(playerTurn) {
            let value = $(this).siblings('p').text()
            for (let i = 0; i < 5; i++) {
                if ($("#cp0" + i).eq(0).text() === value) {
                    $("#cp0" + i).siblings(".valueHint").text(value)
                    $("#cp0" + i).parent().css("background-color", "#47477E")
                }
            }
        }
    }, function() {
        for (let i = 0; i < 5; i++) {
            if (!hands[0][i].valueClue) {
                $("#cp0" + i).siblings(".valueHint").text('')
            }
            $("#cp0" + i).parent().css("background-color", "white")
        }
    })

    $(".valueHint").click(function() {
        if(playerTurn) {
            socket.emit("give_hint", {hint: $(this).siblings('p').text(), room: room})
        }
    })

    function loadP0Cards() {
        for (let i = 0; i < 5; i++) {
            $("#cp0" + i).text(hands[0][i].value)
            $("#cp0" + i).addClass(hands[0][i].suit)

            if (hands[0][i].valueClue) {
                $("#cp0" + i).siblings('.valueHint').eq(0).text(hands[0][i].value)
            }
            if (hands[0][i].suitClue) {
                $("#cp0" + i).siblings('.colorHint').eq(0).css({"background-color" : hands[0][i].suit, "width" : "18px", "height" : "18px"})
            }
        }
    }

    function loadP1Cards() {
        for (let i = 0; i < 5; i++) {
            if (hands[1][i].valueClue) {
                console.log("should be adding text!!")
                $("#cp1" + i).text("" + hands[1][i].value)
            }
            if (hands[1][i].suitClue) {
                $("#cp1" + i).addClass(hands[1][i].suit)
                if ($("#cp1" + i).text() === "") {
                    $("#cp1" + i).text("?");
                }
            }
        }
    }

    function changeTurnDisplay() {
        if (playerTurn) {
            $("#turn > h1:first-child").text("Your Turn! Play a Card or Give a Hint")
        } else {
            $("#turn > h1:first-child").text("Your Partner's Turn!")
        }
    }
})
