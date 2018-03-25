/*The following example defines a utility elt, which creates an element node and treats the rest of its arguments as children to that node.*/

function elt(type) {
  var node = document.createElement(type);
  for (var i = 1; i < arguments.length; i++) {
    var child = arguments[i];
    if (typeof child == "string")
      child = document.createTextNode(child);
    node.appendChild(child);
  }
  return node;
}

function con(words) {
  console.log(words);
}

function getTimeStamp() {
  var hours = (((new Date()).getHours() + 24) % 12) || 12;
  var minutes = (new Date()).getMinutes();
  var seconds = (new Date()).getSeconds();
  if (minutes < 10) {
    minutes = "0" + minutes;
  }
  if (seconds < 10) {
    seconds = "0" + seconds;
  }
  return hours + ":" + minutes + ":" + seconds;
}

function helpTriggerMouse(focCard) {
  div = elt("div");
  div.className = "triggered";
  focCard.appendChild(div);
  return div;
}

//called on every card in the deck zone when 'search' is pressed
var searchDeck = function () {
  length++;
  $(this).on('mouseover', _.debounce(function (event) {
    if ($(this).children()[0].src == fullUrl + "/mtg/card_images/frontSrc2.jpg" || $(this).children()[0].src == fullUrl + "/card_images/frontSrc2.jpg") {//if back of card, show front
      $(this).children()[0].src = "./card_images/" + $(this).children().data("set_id") + "/" + $(this).children().data("card_id") + ".jpg";
    }
    $(this).attr('tabindex', 0);
    $(this).focus();
    var src = $(this).children()[0].src;
    $('.mag').attr("src", src);

    $('body').one('keydown', function (event) {
      var focCard = document.activeElement;
      var div = helpTriggerMouse(focCard);
      switch (event.keyCode) {
        case 37://left
          if (rightCounter > 0) {
            lowestCard.pop().style.zIndex = ++index;
            rightCounter--;
          }
          break;
        case 39://right                   
          if (rightCounter < length - 1) {
            rightCounter++;
            lowestCard.push(focCard);
            focCard.style.zIndex = --negIndex;
          }
          break;
        case 40://down
          cardArray[rightCounter] = focCard;
          choiceArray[rightCounter] += 1;
          switch (choiceArray[rightCounter] % 4) {
            case 0:
              focCard.children[1].innerHTML = "";
              break;
            case 1:
              focCard.children[1].innerHTML = "Field";
              break;
            case 2:
              focCard.children[1].innerHTML = "Hand";
              break;
            case 3:
              focCard.children[1].innerHTML = "Bottom";
              break;
            default:
          }
          $('body').off('keydown');
          event.preventDefault();
          break;
        default:
      }
      setTimeout(function () { div.parentNode.removeChild(div); }, 700);
    });
  }, 500, true));
}

function showSpeak() {
  $('#speak')[0].style.display = "inline";
}

function randomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function logHandler(timeStamp, action) {
  var li = elt('li', (action + timeStamp));
  li.style.color = "#F02828";
  $('#logroom').append(li);
  $('#logroom')[0].scrollTop = $('#logroom')[0].scrollHeight - $('#logroom')[0].clientHeight;
}

function createCard(card, whose, inc) {
  var span = document.createElement('span');
  var img = document.createElement('img');
  span.appendChild(img);
  var indicator = document.createElement("p");
  span.appendChild(indicator);
  if (whose) {
    span.className += (' myCard card');
    span.id = ('m' + inc);
    span.style.zIndex = 60;
    img.setAttribute('src', './card_images/frontSrc2.jpg');
    $(img).data('cardName', card.name);
    $(img).data('set_id', card.set_id);
    $(img).data('card_id', card.card_id);
  }
  else {
    span.className += (' theirCard card');
    span.id = ('o' + inc);
    img.setAttribute('src', './card_images/frontSrc.jpg');
    $(img).data('set_id', card.set_id);
    $(img).data('card_id', card.card_id);
  }
  $('.board').append(span);
}

//Restore event handlers removed from search btn

function restoreHandlers(fullURL) {

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
          socket.emit('flipShowCard', className, $(this).children()[0].src, opponent_socket);
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
          socket.emit('tapped', className, tapTog, opponent_socket);
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

  $(".myCard").draggable({
    containment: "window",
    scroll: false,
    stop: function () {
      var card = $(this).position();
      var src = undefined;

      if ((startCardPos.left >= -16 && startCardPos.left <= 34 && startCardPos.top >= 379 && startCardPos.top <= 427) && !(card.left >= -16 && card.left <= 34 && card.top >= 379 && card.top <= 427)) {
        action = "Drew Card From Deck at ";
        timeStamp = getTimeStamp();
        socket.emit('log', timeStamp, action, opponent_socket);
        logHandler(timeStamp, action);
      }
      if ((startCardPos.left <= 24 && startCardPos.left >= -24 && startCardPos.top <= 344 && startCardPos.top >= 296) && !(card.left <= 24 && card.left >= -24 && card.top <= 344 && card.top >= 296)) {
        var cardName = $(this).children().data('cardName');
        action = cardName + " Retrieved From Grave at ";
        timeStamp = getTimeStamp();
        socket.emit('log', timeStamp, action, opponent_socket);
        logHandler(timeStamp, action);
      }
      $(this).css("zIndex", index++);
      if (!((card.left >= 70 && card.left <= 345 && card.top >= 356 && card.top <= 432) || (card.left >= -12 && card.left <= 174 && card.top <= 220 && card.top >= -12) || (card.left >= -16 && card.left <= 34 && card.top >= 379 && card.top <= 427))) {
        if ($(this).children()[0].src == fullUrl + "/mtg/card_images/frontSrc2.jpg" || $(this).children()[0].src == fullUrl + "/card_images/frontSrc2.jpg") {
          $(this).children()[0].src = "./card_images/" + $(this).children().data("set_id") + "/" + $(this).children().data("card_id") + ".jpg";
        }
        var className = this.id.slice(1);
        var src = "./card_images/" + $(this).children().data("set_id") + "/" + $(this).children().data("card_id") + ".jpg";
        socket.emit('flipShowCard', className, src, opponent_socket);
      }
      //debounce (trailing) this too
      if (card.left < 24 && card.left > -24 && card.top < 344 && card.top > 296) {
        var timeStamp = getTimeStamp();
        var cardName = $(this).children().data('cardName');
        var action = cardName + ' Discarded at '
        socket.emit('log', timeStamp, action, opponent_socket);
        logHandler(timeStamp, action);
      }
      var id = this.id.slice(1);
      socket.emit('dragged', card.left, card.top, id, src, opponent_socket);
    },
    start: function () {
      startCardPos = $(this).position();
    }
  });
}
