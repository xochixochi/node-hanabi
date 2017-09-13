$(document).ready(function() {
    let socket = io.connect(),
        room,
        playerTurn,
        hands,
        hints,
        busts,
        turnCompleting = false,
        selectedcardHandIdx = -1;

    $("#start").on("click", () => {
        socket.emit("request_room")
        $("#start").toggle(400);
        $("#wait").toggle(400);
    })

    socket.on("start_game", gameSetup => {
        $("#lounge").toggle(400);
        $("#board").toggle(400);
        console.log(" I am socket " + socket.id + " in room " + gameSetup.room);
        room = gameSetup.room;
        hands = gameSetup.hands;
        playerTurn = gameSetup.firstTurn;
        hints = 8;
        busts = 3;
        // turnCompleting = false;

        loadP0Cards();
        loadP1Cards();
        toggleTurnDisplay();
        toggleActionButtons(0);
        alterHints(0);
        alterBusts(0);
    })

    socket.on("game_cancelled", msg => {
        resetGame();
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

    socket.on("end_turn", gameData => {
        playerTurn = Math.abs(playerTurn - 1)
        hands = gameData.hands;
        hints = gameData.hints;
        console.log("hints are " + gameData.hints + " of type " + typeof gameData.hints)
        console.log(gameData.hints)
        busts = gameData.busts;
        //check if gameOver

        if (selectedcardHandIdx !== -1) {
            $("cp1" + selectedcardHandIdx).css("background-color", "white");
            selectedcardHandIdx = -1;
        }
        loadP0Cards();
        loadP1Cards();
        loadFireworkCards();
        alterHints(0);
        alterBusts(0);
        loadFireworkCards();
        toggleTurnDisplay();
        toggleActionButtons(0);

        console.log("New hands have arrived")
        console.log(hands)
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
        if(playerTurn && hints > 0) {
            alterHints(-1);
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
        if(playerTurn && hints > 0) {
            alterHints(-1);
            socket.emit("give_hint", {hint: $(this).siblings('p').text(), room: room})
        }
    })

    $(".card.p2").hover(function() {
        if(playerTurn) {
            $(this).css("background-color", "#47477E")
        }
    }, function() {
        if(playerTurn && !(getHandIndexOfCard(this.childNodes[1]) == selectedcardHandIdx)) {
            $(this).css("background-color", "white")
        }
    })

    $(".card.p2").click(function() {
        if(playerTurn) {
            $(this).css("background-color", "#47477E");
            if (selectedcardHandIdx !== -1) {
                $("#cp1" + selectedcardHandIdx).parent().css("background-color", "white")
            }
            selectedcardHandIdx = getHandIndexOfCard(this.childNodes[1])
            toggleActionButtons(1);
        }
    })

    $("#left-board").click(function() {
        if (selectedcardHandIdx > -1) {
            $("#cp1" + selectedcardHandIdx).parent().css("background-color", "white")
            selectedcardHandIdx = -1;
            toggleActionButtons(0);
        }
    })

    $("#play-card").click(function() {
        if (playerTurn && selectedcardHandIdx > -1) {
            //activate endofturn mode
            toggleActionButtons(0);
            $("#cp1" + selectedcardHandIdx).parent().css("background-color", "white");
            $("#cp1" + selectedcardHandIdx).text("")
            $("#cp1" + selectedcardHandIdx).attr("class", "")
            socket.emit("play_card", {"room": room, "cardHandIdx": selectedcardHandIdx });
        }
    })
    $("#discard-card").click(function() {
        if (playerTurn && selectedcardHandIdx > -1) {
            socket.emit("discard_card")
        }
    })

    function getHandIndexOfCard(cardDOMElement) {
        return cardDOMElement.getAttribute('id').charAt(cardDOMElement.getAttribute('id').length - 1);
    }

    function loadP0Cards() {
        for (let i = 0; i < 5; i++) {
            $("#cp0" + i).text(hands[0][i].value)
            $("#cp0" + i).attr('class', hands[0][i].suit)

            if (hands[0][i].valueClue) {
                $("#cp0" + i).siblings('.valueHint').eq(0).text(hands[0][i].value)
            } else {
                $("#cp0" + i).siblings('.valueHint').eq(0).text("")
            }
            if (hands[0][i].suitClue) {
                $("#cp0" + i).siblings('.colorHint').eq(0).css({"background-color" : hands[0][i].suit, "width" : "18px", "height" : "18px"})
            } else {
                $("#cp0" + i).siblings(".colorHint").css("background-color", "buttonface")
            }
        }
    }

    function loadP1Cards() {
        for (let i = 0; i < 5; i++) {
            if (hands[1][i].valueClue) {
                $("#cp1" + i).text(hands[1][i].value)
            }
            if (hands[1][i].suitClue) {
                $("#cp1" + i).attr('class', hands[1][i].suit)
                if ($("#cp1" + i).text() === "") {
                    $("#cp1" + i).text("?");
                }
            }
        }
    }

    function loadFireworkCards() {
        for (let i = 0; i < hands[2].length; i++) {
            $("#cf" + i).parent().attr("class", "card");
            $("#cf" + i).text(hands[2][i].value);
            $("#cf" + i).attr("class", hands[2][i].suit);
        }
    }

    function alterHints(amount) {
        hints += amount;
        $("#right-board > ul li:first-of-type p:last-of-type").text(hints)
    }

    function alterBusts(amount) {
        busts += amount;
        $("#right-board > ul li:last-of-type p:last-of-type").text(busts)
    }

    function toggleActionButtons(state) {
        let buttons = $(".action-button").get()
        if (state) {
            buttons.forEach(button => {
                button.style.display = 'inline-block'
            });
        } else {
            buttons.forEach(button => {
                button.style.display = 'none'
            });
        }
    }
    function toggleTurnDisplay() {
        if (playerTurn) {
            $("#turn > h1:first-child").text("Your Turn! Play a Card or Give a Hint")
        } else {
            $("#turn > h1:first-child").text("Your Partner's Turn!")
        }
    }

    function resetGame() {
        for (let i = 0; i < 5; i++) {
            $("#cp0" + i).attr("class", "")
            $("#cp0" + i).text("")
            $("#cp1" + i).attr("class", "")
            $("#cp1" + i).text("")
        }
        $(".colorHint").css("background-color", "buttonface")
        $(".valueHint").text("")
    }
})
