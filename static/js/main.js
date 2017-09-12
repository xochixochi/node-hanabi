$(document).ready(function() {
    console.log("the javascript is working")
    var socket = io.connect();
    var room;
    $("#start").on("click", () => {
        socket.emit("request_room")
        $("#start").toggle(400);
        $("#wait").toggle(400);
    })
    socket.on("end_wait", () => {
        $("#lounge").toggle(400);
        $("#board").toggle(400);

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
})
