/*The following example defines a utility elt, which creates an element node and treats the rest of its arguments as children to that node.*/

function elt(type){
  var node = document.createElement(type);
  for (var i = 1; i < arguments.length; i++) {
    var child = arguments[i];
    if (typeof child == "string")
      child = document.createTextNode(child);
    node.appendChild(child);
  }
  return node;
}

function con(words){
	console.log(words);
}

function getTimeStamp(){
	var hours = (((new Date()).getHours() + 24) % 12) || 12;
	var minutes = (new Date()).getMinutes();
	var seconds = (new Date()).getSeconds();
	if(minutes < 10){
		minutes = "0" + minutes;
	}
	if(seconds < 10){
		seconds = "0" + seconds;	
	}
	return hours + ":" + minutes + ":" + seconds;
}

//All the event handlers in a single function

function restoreHandlers(fullURL){

	$('.myCard').on('mousedown', function(event){
    if(event.which == 3){
      if(!event.ctrlKey){ 
        if($(this).children()[0].src == fullURL + "/card_images/frontSrc2.jpg"){
          $(this).children()[0].src = "/card_images/" + $(this).children().data("set_id") + "/" + $(this).children().data("card_id") + ".jpg";
        }
        else{
          $(this).children()[0].src = "/card_images/frontSrc2.jpg";
        }
        var card = $(this).position();
        if(!((card.left >= 76 && card.left <= 345 && card.top >= 368 && card.top <= 412) || (card.left >= -12 && card.left <= 174 && card.top <= 220 && card.top >= -12))){
          var className = this.id.slice(1);
          socket.emit('flipShowCard', className, $(this).children()[0].src);
        }
        event.preventDefault();
      }
      else{
        if(event.ctrlKey){
          if($(this)[0].style.transform == "rotate(90deg)"){
            $(this).css("transform","rotate(0deg)");
            var tapTog = true;
          }
          else{
            $(this).css("transform","rotate(90deg)");
            var tapTog = false;
          }
          var className = this.id.slice(1);
          socket.emit('tapped', className, tapTog);
        }
      }
    }
  });

  $('.myCard').mouseover(function(){
    if($(this).children()[0].src == fullURL + '/card_images/frontSrc2.jpg'){
        $('.mag').attr("src", "/card_images/frontSrc2.jpg");
    }
    else{
      $('.mag').attr("src", "/card_images/" + $(this).children().data("set_id") + "/" + $(this).children().data("card_id") + ".jpg");
    }
  });

  $(".myCard").draggable({
    stop: function(){
      var card = $(this).position();
      var src = undefined;

      if((startCardPos.left >= -16 && startCardPos.left <= 34 && startCardPos.top >= 379 && startCardPos.top <= 427) && !(card.left >= -16 && card.left <= 34 && card.top >= 379 && card.top <= 427)){
        action = "Drew Card From Deck at ";
        timeStamp = getTimeStamp();
        socket.emit('log', timeStamp, action);
        logHandler(timeStamp, action);
      }
      if((startCardPos.left <= 24 && startCardPos.left >= -24 && startCardPos.top <= 344 && startCardPos.top >= 296) && !(card.left <= 24 && card.left >= -24 && card.top <= 344 && card.top >= 296)){
        var cardName = $(this).children().data('cardName');
        action = cardName + " Retrieved From Grave at "; 
        timeStamp = getTimeStamp();
        socket.emit('log', timeStamp, action);
        logHandler(timeStamp, action);
      }
      $(this).css("zIndex",index++);
      if(!((card.left >= 70 && card.left <= 345 && card.top >= 356 && card.top <= 432) || (card.left >= -12 && card.left <= 174 && card.top <= 220 && card.top >= -12) || (card.left >= -16 && card.left <= 34 && card.top >= 379 && card.top <= 427))){
        if($(this).children()[0].src == fullURL + "/card_images/frontSrc2.jpg"){
          $(this).children()[0].src = "/card_images/" + $(this).children().data("set_id") + "/" + $(this).children().data("card_id") + ".jpg";
        }
        var className = this.id.slice(1);
        var src = "/card_images/" + $(this).children().data("set_id") + "/" + $(this).children().data("card_id") + ".jpg";
        socket.emit('flipShowCard', className, src);
      }
      //debounce (trailing) this too
      if(card.left < 24 && card.left > -24 && card.top < 344 && card.top > 296){
        var timeStamp = getTimeStamp();
        var cardName = $(this).children().data('cardName');
        var action = cardName + ' Discarded at '
        socket.emit('log', timeStamp, action);
        logHandler(timeStamp, action);
      }
      var id = this.id.slice(1);
      socket.emit('dragged', card.left, card.top, id, src);
    },
    start: function(){
      startCardPos = $(this).position();
    }
  });
}
