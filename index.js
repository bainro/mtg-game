//require and instantiate dependencies
var express = require('express');
var fs = require('fs');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var shuffle = require('shuffle-array');
var jsdom = require("jsdom");
var { JSDOM } = jsdom;
var { window } = new JSDOM(`<!DOCTYPE html>`);
var $ = require('jquery')(window);
var mysql = require('mysql');
const dotenv = require('dotenv').config();

//Global variable used to map sockets to clients
var clients = [];
var count = 0;

//Connect to MySQL database
var con = mysql.createConnection({  
  host: process.env.DB_HOST,            
  user: process.env.DB_USER,                      
  password: process.env.DB_PASS,            
  database: process.env.DB
});

con.connect(function(err) {
  if (err) console.log("ERROR while Connecting to MySQL");
});

//This keeps the MySQL connection open until the server closes
setInterval(function () {
    con.query('SELECT 1');
}, 1000*60*60);

app.use(express.static('media'));		//Get requests for static files start in the 'media' directory of mtg folder

app.get('/game', function (req, res) {
  res.sendFile(__dirname + '/game/index.html');
});

app.get('/builder', function (req, res) {
  res.sendFile(__dirname + '/builder/index.html');
});

//begin on connection event handler for the game namespace

var game_nsp = io.of('/game');

game_nsp.on('connection', function(socket){
  	
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

    socket.on('get deck options', function(){
      con.query("SELECT name FROM `decks` WHERE globalBool = 1 & published = 1", function(err, result, _fields){
        var options = JSON.parse(JSON.stringify(result));
        socket.emit('give deck options', options);
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
//end on connection event handler for game namespace


//socket event handlers for the deck builder namespace

var db_nsp = io.of('/builder');

db_nsp.on('connection', function(socket){

  socket.on('card query', function(cardName, edition, card_num, exact_flag){
    if(exact_flag !== true && exact_flag !== false){
      console.log('exact_flag was SQL injection?');
      return;
    }
    var query_text = "WHERE name = ? ORDER BY `name` ASC";
    if(!exact_flag){
      if(cardName == null){
        query_text = "ORDER BY RAND() LIMIT 1";
      }
      else{
        query_text = "WHERE name LIKE '%' ? '%' ORDER BY `name` ASC";
      }
    }
    con.query("SELECT name, set_id, card_id FROM card_img_info " + query_text, cardName, function (err, result, _fields) {
      if (err) throw err;
      if(result.length > 0){
        var resultObj = JSON.parse(JSON.stringify(result)), set_id_array = [], card_id_array = [], card_name_array = [];
        for(var inc = 0; inc < resultObj.length; inc++){
          set_id_array.push(resultObj[inc].set_id);
          card_id_array.push(resultObj[inc].card_id);
          card_name_array.push(resultObj[inc].name);
        }
        if(edition){
          var inc = 0;
          while(inc < set_id_array.length){
            if(set_id_array[inc] == edition && card_id_array[inc] == card_num){
              //switch the 0 index and this index
              var temp_set = set_id_array[inc];
              var temp_num = card_id_array[inc];
              var temp_name = card_name_array[inc];
              set_id_array[inc] = set_id_array[0];
              card_id_array[inc] = card_id_array[0];
              card_name_array[inc] = card_name_array[0];
              set_id_array[0] = temp_set;
              card_id_array[0] = temp_num;
              card_name_array[0] = temp_name;
              break;
            }
            inc++;
          }
        }
        if(resultObj[resultObj.length -1].name !== resultObj[0].name){
          socket.emit('card query result', set_id_array, card_id_array, card_name_array, 'Other Cards:');
          return;
        }
        socket.emit('card query result', set_id_array, card_id_array, card_name_array, 'Editions:');
      }
      else{
        socket.emit('card query result', null, null, card_name_array);
      }
    });  
  });

  socket.on('get deck', function(deckName){
    var deck = JSON.parse(fs.readFileSync("./media/decks/" + deckName + ".json", 'utf8'));
    socket.emit('given deck', deck, deckName);
  });

  socket.on('get deck options', function(){
    con.query("SELECT name FROM `decks` WHERE globalBool = 1 & published = 1", function(err, result, _fields){
      var options = JSON.parse(JSON.stringify(result));
      socket.emit('give deck options', options);
    });
  });

  socket.on('delete deck', function(deck_name){
    fs.unlink('./media/decks/' + deck_name + '.json', function (err) {
      if (err) console.log("error while deleting: " + deck_name, err);
      else console.log( deck_name + ' deleted!');
    });
    con.query("DELETE FROM `decks` WHERE name = ?", deck_name, function(err, result, _fields){
      if (err) console.log("error while deleting: " + deck_name + " from MySQL db", err);
      else console.log( deck_name + ' deleted from MySQL db!');
    });
  });

  socket.on('create new deck', function(deck_name){
    fs.open('./media/decks/' + deck_name + ".json", 'wx+', (err, fd) => {
      if(err){
        console.log("error creating deck: " + deck_name + " on FS");
        socket.emit('deck creation fail', "Writing to Server File System Failed. Check that the deck name does not already exist.");
      }
      else{
        //var module_text = 'var deck = []; module.exports = deck;';
        fs.write(fd, '[]', (err)=>{
          if(err){
            console.log(err);
          }
          fs.close(fd, ()=>{});
        });
        console.log("Deck: " + deck_name + " created successfully on FS");
        //create deck in MySQL DB:
        con.query("INSERT INTO `decks` (`name`, `published`, `owner`, `globalBool`) VALUES (?, '1', '1', '1')", deck_name, function(err, result, _fields){
          if (err){
            console.log("error while creating: " + deck_name + " in MySQL DB", err);
            socket.emit('deck creation fail', 'Writing to the MySQL Database failed. :(');
          }
          else{
            console.log( deck_name + ' created in MySQL DB!');
            socket.emit('new deck created', deck_name);
          }
        });
      }
    });
  });

  socket.on('save deck', (deck_array, deck_name)=>{
    fs.open('./media/decks/' + deck_name + ".json", 'w+', (err, fd) => {
      if(err){
        console.log("error saving deck: " + deck_name + " on FS");
        socket.emit('deck save fail', "Writing to Server File System Failed.");
      }
      else{
        deck_array = JSON.stringify(deck_array);
        //var module_text = 'var deck = ' + deck_array + '; module.exports = deck;';
        fs.write(fd, deck_array, (err)=>{
          if(err){
            console.log(err);
          }
          fs.close(fd, ()=>{});
        });
      }
    });
  });

  socket.on('rename deck', (old_name, new_name)=>{
    fs.rename('./media/decks/' + old_name + '.json', './media/decks/' + new_name + '.json', (err)=>{
      if(err)
        console.log(err);
      else{
        con.query("UPDATE `decks` SET `name` = ? WHERE `decks`.`name` = ?", [new_name, old_name], function(error){
          if (error){
            console.log("error while renaming: " + deck_name + " in MySQL DB", error);
          }
          else{
            socket.emit('deck renamed', old_name, new_name);
          }
        });
      }
    });
  });

});
//end of deck builder namespace connection event handler

http.listen(89, function(){
  console.log('Node web server listening on *:89');
});

//Global Functions

function sendDecks(){

  var choice1 = clients[0].deck;
  var choice2 = clients[1].deck;
  var socket1 = clients[0].id;
  var socket2 = clients[1].id;

  var deck = JSON.parse(fs.readFileSync("./media/decks/" + choice1 + ".json", 'utf8'));
  shuffle(deck);
  game_nsp.to(socket1).emit('given deck', deck);
  var oCards2 = [];
  for(var inc = 0; inc < deck.length; inc++){
    oCards2.push({"name":"","frontSrc":"frontSrc"});
  }
  game_nsp.to(socket2).emit('given opponent', oCards2);

  if(choice1 != choice2){
 	  deck = JSON.parse(fs.readFileSync("./media/decks/" + choice2 + ".json", 'utf8'));
  }
  shuffle(deck);
  game_nsp.to(socket2).emit('given deck', deck);
  var oCards1 = [];
  for(var inc = 0; inc < deck.length; inc++){
    oCards1.push({"name":"","frontSrc":"frontSrc"});
  }
  game_nsp.to(socket1).emit('given opponent', oCards1);

};