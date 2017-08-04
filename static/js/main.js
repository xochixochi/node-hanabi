$(document).ready(function() {
    var socket = io.connect();

    $("form").submit(function(e) {
        e.preventDefault();
        var formData = {};
        $("form").serializeArray().forEach(function(formItem) {
            formData[formItem.name] = formItem.value;
        })
        console.log("emitting");
        socket.emit("submitform", formData);
    })

    socket.on( 'form_response', function (data){
        console.log( 'The server says: ')
        console.log(data);
        $("#result").text( "You emitted the following information to the server " + JSON.stringify(data));
    });
})
