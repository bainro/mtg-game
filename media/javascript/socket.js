socket.on('give deck options', function (options) {
    var tempItem;
    if (options === null) {
        //toggle modal
        //$('#login_modal').modal('show');
    }
    for (var i = 0; i < options.length; i++) {
        tempItem = $("<option>", { class: "deck-select", text: options[i].name });
        $('.deckOptions').append(tempItem);
    }
});

socket.on('background', function (url, desc) {
    $('#background-img').attr("src", url);
    $('#background-desc').html(desc + "<br><a href=" + url + " target='_blank'>View Full Image</a>").scrollTop(0);
});

socket.on('deltaHealth', function (bool) {
    if (bool) {
        $('#theirHealth')[0].innerHTML = ++theirHealth;
    }
    else {
        $('#theirHealth')[0].innerHTML = --theirHealth;
    }
});

socket.on("message", function (msg) {
    var li = document.createElement('li');
    li.style.color = "#2C83E2";
    li.style.textAlign = "left";
    li.style.paddingLeft = ".3em";
    li.style.borderBottom = "1px #ffffff40 dotted";
    li.style.borderLeft = "1px #ffffff40 dotted";
    li.style.borderRight = "1px #ffffff40 dotted";
    li.appendChild(document.createTextNode(msg));
    $('#chatroom').append(li);
    $('#chatroom')[0].scrollTop = $('#chatroom')[0].scrollHeight - $('#chatroom')[0].clientHeight;
    if ( $('#chat')[0].style.display == 'none' ) {
        $('#chat-anchor').addClass('new-message');
    }
});

socket.on('addCounter', function (counterText, moreText, id) {
    var query = '#o' + id;
    var card = $(query);
    card.children().eq(1).text(counterText);
    card[0].title = moreText;
});

//begin 'given deck' event handler
socket.on('given deck', function (deck) {

    var counterText = "2/3";
    var moreText = "Flying 3 Charge Counters";

    for (myCardCount; myCardCount < deck.length; myCardCount++) {
        createCard(deck[myCardCount], true, myCardCount);
    }

    $(".myCard").draggable({
        stop: function () {
            var card = $(this).position();
            var src = undefined;

            if ((startCardPos.left >= -16 && startCardPos.left <= 34 && startCardPos.top >= 379 && startCardPos.top <= 427) && !(card.left >= -16 && card.left <= 34 && card.top >= 379 && card.top <= 427)) {
                action = "Drew Card From Deck at ";
                timeStamp = getTimeStamp();
                socket.emit('log', timeStamp, action);
                logHandler(timeStamp, action);
            }
            if ((startCardPos.left <= 24 && startCardPos.left >= -24 && startCardPos.top <= 344 && startCardPos.top >= 296) && !(card.left <= 24 && card.left >= -24 && card.top <= 344 && card.top >= 296)) {
                var cardName = $(this).children().data('cardName');
                action = cardName + " Retrieved From Grave at ";
                timeStamp = getTimeStamp();
                socket.emit('log', timeStamp, action);
                logHandler(timeStamp, action);
            }
            $(this).css("zIndex", index++);
            if (!((card.left >= 70 && card.left <= 345 && card.top >= 356 && card.top <= 432) || (card.left >= -12 && card.left <= 174 && card.top <= 220 && card.top >= -12) || (card.left >= -16 && card.left <= 34 && card.top >= 379 && card.top <= 427))) {
                if ($(this).children()[0].src == fullUrl + "/mtg/card_images/frontSrc2.jpg" || $(this).children()[0].src == fullUrl + "/card_images/frontSrc2.jpg") {
                    $(this).children()[0].src = "./card_images/" + $(this).children().data("set_id") + "/" + $(this).children().data("card_id") + ".jpg";
                }
                var className = this.id.slice(1);
                var src = "./card_images/" + $(this).children().data("set_id") + "/" + $(this).children().data("card_id") + ".jpg";
                socket.emit('flipShowCard', className, src);
            }
            //debounce (trailing) this too
            if (card.left < 24 && card.left > -24 && card.top < 344 && card.top > 296) {
                var timeStamp = getTimeStamp();
                var cardName = $(this).children().data('cardName');
                var action = cardName + ' Discarded at '
                socket.emit('log', timeStamp, action);
                logHandler(timeStamp, action);
            }
            var id = this.id.slice(1);
            socket.emit('dragged', card.left, card.top, id, src);
        },
        start: function () {
            startCardPos = $(this).position();
        }
    });

    $('.myCard').on('dblclick', function (event) {
        if (!event.ctrlKey) {
            counterText = window.prompt("Power/Toughness:", counterText);
            moreText = window.prompt("Other Text to add to Card", moreText);
            $(this).children().eq(1).text(counterText);
            this.title = moreText;
            var id = this.id.slice(1);
            socket.emit('addCounter', counterText, moreText, id);
        }
        else {
            this.style.zIndex = --negIndex;
            $(this).children()[0].src = "./card_images/frontSrc2.jpg"
            this.style.top = 412 + "px";
            this.style.left = 0;
            var card = $(this).position();
            var id = this.id.slice(1);
            var src = $(this).children().src;
            socket.emit('dragged', card.left, card.top, id, src);
            if (negIndex < 2) {
                negIndex = 60;
            }
        }
    });

    $('.myCard').on('mousedown', function (event) {
        if (event.which == 3) {
            if (!event.ctrlKey) {
                if ($(this).children()[0].src == fullUrl + "/mtg/card_images/frontSrc2.jpg" || $(this).children()[0].src == fullUrl + "/card_images/frontSrc2.jpg") {
                    $(this).children()[0].src = "./card_images/" + $(this).children().data("set_id") + "/" + $(this).children().data("card_id") + ".jpg";
                }
                else {
                    $(this).children()[0].src = "./card_images/frontSrc2.jpg";
                }
                var card = $(this).position();
                if (!((card.left >= 76 && card.left <= 345 && card.top >= 368 && card.top <= 412) || (card.left >= -12 && card.left <= 174 && card.top <= 220 && card.top >= -12))) {
                    var className = this.id.slice(1);
                    socket.emit('flipShowCard', className, $(this).children()[0].src);
                }
                event.preventDefault();
            }
            else {
                if (event.ctrlKey) {
                    if ($(this)[0].style.transform == "rotate(90deg)") {
                        $(this).css("transform", "rotate(0deg)");
                        var tapTog = true;
                    }
                    else {
                        $(this).css("transform", "rotate(90deg)");
                        var tapTog = false;
                    }
                    var className = this.id.slice(1);
                    socket.emit('tapped', className, tapTog);
                }
            }
        }
    });

    $('.myCard').mouseover(function () {
        if ($(this).children()[0].src == fullUrl + "/mtg/card_images/frontSrc2.jpg" || $(this).children()[0].src == fullUrl + "/card_images/frontSrc2.jpg") {
            $('.mag').attr("src", "./card_images/frontSrc2.jpg");
        }
        else {
            $('.mag').attr("src", "./card_images/" + $(this).children().data("set_id") + "/" + $(this).children().data("card_id") + ".jpg");
        }
    });

});//end 'given deck' event handler

socket.on('dragged', function (left, top, id, src) {
    var query = '#o' + id;
    document.querySelector(query).style.top = "auto";
    document.querySelector(query).style.left = "auto";
    document.querySelector(query).style.bottom = top + "px";
    document.querySelector(query).style.right = left + "px";
    document.querySelector(query).style.zIndex = index++;
    if ($(query).children()[0]) {
        if (src) {
            $(query).children()[0].src = src;
        }
        else if (src !== undefined) {
            $(query).children()[0].src = './card_images/frontSrc.jpg';
        }
    }
});

socket.on('tapped', function (id, tapCur) {
    var query = '#o' + id;
    if (tapCur) {
        document.querySelector(query).style.transform = "rotate(0deg)";
    }
    else {
        document.querySelector(query).style.transform = "rotate(90deg)";
    }
});

socket.on('flipShowCard', function (id, src) {
    var query = '#o' + id;
    $(query).children()[0].src = src;
    $(query)[0].style.zIndex = index++;
});

socket.on('given opponent', function (JSON) {
    for (opponentCardCount; opponentCardCount < JSON.length; opponentCardCount++) {
        createCard(JSON[opponentCardCount], false, opponentCardCount);
    }

    $('.theirCard').mouseenter(function () {
        $('.mag').attr("src", $(this).children()[0].src);
    });

    $('#shuffle, #search, #builder, #myHealth, #theirHealth, #token, #apod, #background-desc').each(function (_, element) { element.style.display = "inline" });
    $('#help').removeClass('help-first').addClass('help-second');
});

socket.on('destroyToken', function (id) {
    var query = '#o' + id;
    $(query).remove();
});

socket.on('createToken', function (powerTough, tokenText, myCardCount, color1, color2, color3, angle) {
    var token = elt("div", powerTough);
    token.className += ('token');
    token.title = tokenText;
    token.id = ('o' + myCardCount);
    opponentCardCount++;
    token.style.background = color1;
    token.style.background = "-webkit-linear-gradient(to top, " + color1 + ", " + color2 + ", " + color3 + ")";
    token.style.background = "linear-gradient(" + angle + "deg, " + color1 + ", " + color2 + ", " + color3 + ")";
    $('.board').append(token);
});

socket.on('log', function (timeStamp, action) {
    var li = elt('li', (action + timeStamp));
    li.style.color = "#2C83E2";
    li.style.textAlign = "left";
    $('#logroom').append(li);
    $('#logroom')[0].scrollTop = $('#logroom')[0].scrollHeight - $('#logroom')[0].clientHeight;
});