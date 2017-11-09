//require and instantiate dependencies
var express = require('express');
var cors = require('cors')
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

app.use(cors());						//Used to make cross-domain scripting possible (need to apply filter in the future)
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

  	$.getJSON("http://67.160.162.82:89/decks/" + choice1 + ".json", function(response){
       for(var inc = 0; inc < response.length; inc++){
       		deck1.push(response[inc]);
       }
       shuffle(deck1);
       io.to(socket1).emit('given deck', deck1);
       var oCards2 = [];
       for(var inc = 0; inc < deck1.length; inc++){
       		deck1[inc].name="";
       		deck1[inc].frontSrc="frontSrc";
       		oCards2.push(deck1[inc]);
       }
       io.to(socket2).emit('given opponent', oCards2);
 	});

 	$.getJSON("http://67.160.162.82:89/decks/" + choice2 + ".json", function(response){
       for(var inc = 0; inc < response.length; inc++){
       		deck2.push(response[inc]);
       }
       shuffle(deck2);
       io.to(socket2).emit('given deck', deck2);
       var oCards1 = [];
       for(var inc = 0; inc < deck2.length; inc++){
       		deck2[inc].name="";
       		deck2[inc].frontSrc="frontSrc";
       		oCards1.push(deck2[inc]);
       }
       io.to(socket1).emit('given opponent', oCards1);
 	});

};