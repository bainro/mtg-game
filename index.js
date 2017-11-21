//require and instantiate dependencies
var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var shuffle = require('shuffle-array');
var jsdom = require("jsdom");
var { JSDOM } = jsdom;
var { window } = new JSDOM(`<!DOCTYPE html>`);
var $ = require('jQuery')(window);

//Global variable used to map sockets to clients
var clients = [];
var count = 0;

app.use(express.static('media'));		//Get requests for static files start in the 'media' directory of mtg folder

app.get('/', function (req, res, next) {
  res.sendFile(__dirname + '/index.html');
});

//begin on connection event handler
io.on('connection', function(socket){
  	console.log(++count + " Players Connected to Server"); 
  	socket.on('dragged', function(left, top, id, src){
  		socket.broadcast.emit('dragged', left, top, id, src);
  	});

  	socket.on('deck chosen', function(id, deck){
  		var client = {};
  		client["id"] = socket.id;
  		client["deck"] = deck;
  		clients.push(client);
  		if(clients.length == 2){
  			sendDecks();
  		}
  	}); 

    socket.on('background', function(){ 
      var msecToday = new Date();
      var msecRandDate = new Date (msecToday - Math.floor((Math.random() * 3e11)));
      var randMonth = String(msecRandDate.getUTCMonth() + 1);
      var randDate = msecRandDate.getUTCFullYear() + "-" + randMonth + "-" + msecRandDate.getUTCDate();
      $.get("https://api.nasa.gov/planetary/apod?api_key=1HpGxq0MOK7fwnhKrx0UKV6h06pgAqrGoyHuXIbz&date=" + randDate, function(data){
        var url = data.url;
        var desc = data.explanation;
        socket.emit('background', url, desc);
      });
    });

    socket.on('log', function(timeStamp, action){
      socket.broadcast.emit('log', timeStamp, action);
    });

  	socket.on('message', function(msg){
  		socket.broadcast.emit('message', msg);
  	});

  	socket.on('deltaHealth', function(bool){
  		socket.broadcast.emit('deltaHealth', bool);
  	});

  	socket.on('createToken', function(powerTough, tokenText, myCardCount, color1, color2, color3, angle){
  		socket.broadcast.emit('createToken', powerTough, tokenText, myCardCount, color1, color2, color3, angle);
  	});

  	socket.on('disconnect', function(){
  		for(var inc = 0; inc < clients.length; inc++){
  			if(clients[inc].id == this.id){
  				clients.splice(inc, 1);
  			}
  		}
  	console.log(--count + " Players Connected to Server"); 
  	});

  	socket.on('tapped', function(id, tapCur){
  		socket.broadcast.emit('tapped', id, tapCur);
  	}); 

  	socket.on('flipShowCard', function(id, src){
  		socket.broadcast.emit('flipShowCard', id, src);
  	}); 

    socket.on('destroyToken', function(id){
      socket.broadcast.emit('destroyToken', id);
    });

    socket.on('addCounter', function(counterText, moreText, id){
      socket.broadcast.emit('addCounter', counterText, moreText, id);
    });

});
//end on connection event handler

http.listen(89, function(){
  console.log('CORS-enabled web server listening on *:89');
});

//Global Functions

function sendDecks(){

  var deck1 = [];
  var deck2 = [];
  var choice1 = clients[0].deck;
  var choice2 = clients[1].deck;
  var socket1 = clients[0].id;
  var socket2 = clients[1].id;

  var deckTemp = require("./media/decks/" + choice1 + ".js"); //module handle is live or something? Can't be passed thru socket...
  var deck = deckTemp;
  shuffle(deck);
  io.to(socket1).emit('given deck', deck);
  var oCards2 = [];
  for(var inc = 0; inc < deck.length; inc++){
    oCards2.push({"name":"","frontSrc":"frontSrc"});
  }
  io.to(socket2).emit('given opponent', oCards2);

  if(choice1 != choice2){
 	  deckTemp = require("./media/decks/" + choice2 + ".js");
  }
  deck = deckTemp;
  shuffle(deck);
  io.to(socket2).emit('given deck', deck);
  var oCards1 = [];
  for(var inc = 0; inc < deck.length; inc++){
    oCards1.push({"name":"","frontSrc":"frontSrc"});
  }
  io.to(socket1).emit('given opponent', oCards1);

};