//require and instantiate dependencies
const express = require('express');
const fs = require('fs');
const app = express();
const cookieParser = require('cookie-parser');
const http = require('http').Server(app);
var io = require('socket.io')(http);
const shuffle = require('shuffle-array');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { window } = new JSDOM(`<!DOCTYPE html>`);
//only use jquery for get request... replacement: request
const $ = require('jquery')(window);
const mysql = require('mysql');
const dotenv = require('dotenv').config();
const fileUpload = require('express-fileupload');

//Global variable used to map sockets to clients
var clients = [];

//Connect to MySQL database
const con = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB
});

con.connect(function (err) {
  if (err) console.log("ERROR while Connecting to MySQL");
});

con.on('error', function (err) {
  console.log("MySQL err caught: ", err);
});

//This keeps the MySQL connection open until the server closes
setInterval(function () {
  con.query('SELECT 1');
}, 1000 * 60 * 60);

app.use(cookieParser());
app.use(express.static('media'));		//Get requests for static files start in the 'media' directory of mtg folder
app.use(fileUpload());

app.get('/game', function (req, res) {
  res.sendFile(__dirname + '/game/index.html');
});

app.post('/builder', (req, res) => {
  let custom_back = req.files.custom_back_img;
  custom_back.mv('./media/db_media/images/' + 'robrob' + '.jpg', (err) => {
    if (err)
      return res.send('File failed to upload! :(');

    res.send('File uploaded! :)');
  });
});

app.get('/builder', function (req, res) {
  if (req.cookies['PHPSESSID']) { var id = req.cookies['PHPSESSID']; }
  else { res.redirect('http://rkbain.com/mtg_training_guild/login_builder.php'); return; }
  con.query("SELECT data FROM sessions WHERE id = '" + id + "' AND data IS NOT NULL", function (err, result, _fields) {
    if (result[0] && result[0].data) {
      res.sendFile(__dirname + '/builder/index.html');
    }
    else { res.redirect('http://rkbain.com/mtg_training_guild/login_builder.php'); }
  });
});

/*
begin on connection event handler for the game namespace
*/
var game_nsp = io.of('/game');

game_nsp.on('connection', function (socket) {

  console.log("Player Connected to server");

  socket.username = "Guest";
  con.query("SELECT data FROM sessions WHERE id = '" + socket.handshake.query['user'] + "' AND data IS NOT NULL", function (err, result, _fields) {

    if (result[0] && result[0].data) {
      socket.username = result[0].data.split('"')[1];
    }

    //add to clients 
    const client = {
      id: socket.id,
      username: socket.username
    };
    //present with list of room options
    clients.push(client);
    socket.emit('available games', clients);
    socket.broadcast.emit('available games', clients);
    //good place to send event to update game options. use broadcast

  });

  socket.on('dragged', function (left, top, id, src, opponent) {
    game_nsp.to(opponent).emit('dragged', left, top, id, src);
  });

  //going to have to change with new room code
  //should be able to send decks immediately instead
  //of waiting for both to be chosen since
  //deck options will not be given until a room has 2 clients
  socket.on('deck chosen', function (o_socket, choice) {
    if (socket.username === 'robrob') 
      console.log('robrob chose a deck, bish');
    const this_socket = socket.id;
    sendDeck(choice, this_socket, o_socket);
  });

  socket.on('background', function () {
    var msecToday = new Date();
    var msecRandDate = new Date(msecToday - Math.floor((Math.random() * 3e11)));
    var randMonth = String(msecRandDate.getUTCMonth() + 1);
    var randDate = msecRandDate.getUTCFullYear() + "-" + randMonth + "-" + msecRandDate.getUTCDate();
    $.get("https://api.nasa.gov/planetary/apod?api_key=1HpGxq0MOK7fwnhKrx0UKV6h06pgAqrGoyHuXIbz&date=" + randDate, function (data) {
      var url = data.url;
      var desc = data.explanation;
      socket.emit('background', url, desc);
    });
  });

  socket.on('get deck options', function () {

    if (socket.username !== 'Guest') {
      con.query("SELECT name, owner FROM decks ORDER BY owner = '" + socket.username + "' DESC", function (err, result, _fields) {
        var options = JSON.parse(JSON.stringify(result));
        socket.emit('give deck options', options);
      });
    }
    else {
      con.query("SELECT name FROM decks", function (err, result, _fields) {
        var options = JSON.parse(JSON.stringify(result));
        socket.emit('give deck options', options);
      });
    }
  });

socket.on('log', function (timeStamp, action, opponent) {
  game_nsp.to(opponent).emit('log', timeStamp, action);
});

socket.on('message', function (msg, opponent) {
  game_nsp.to(opponent).emit('message', msg);
});

socket.on('deltaHealth', function (bool, opponent) {
  game_nsp.to(opponent).emit('deltaHealth', bool);
});

socket.on('createToken', function (powerTough, tokenText, myCardCount, color1, color2, color3, angle, opponent) {
  game_nsp.to(opponent).emit('createToken', powerTough, tokenText, myCardCount, color1, color2, color3, angle);
});

socket.on('disconnect', function () {
  console.log('Player disconnected from server');
  //filter clients array of this socket (might not exist)
  clients = clients.filter(item => {
    if (item.id !== socket.id) return true;
    else return false;
  });
  //emit updated clients list
  socket.broadcast.emit('available games', clients);
});

socket.on('tapped', function (id, tapCur, opponent) {
  game_nsp.to(opponent).emit('tapped', id, tapCur);
});

socket.on('flipShowCard', function (id, src, opponent) {
  game_nsp.to(opponent).emit('flipShowCard', id, src);
});

socket.on('destroyToken', function (id, opponent) {
  game_nsp.to(opponent).emit('destroyToken', id);
});

socket.on('addCounter', function (counterText, moreText, id, opponent) {
  game_nsp.to(opponent).emit('addCounter', counterText, moreText, id);
});

//confirm this game choice is still valid
socket.on('game chosen', socketID => {
  //if socketID is still in clients
  if (
    clients.filter(item => {
      if (item.id === socketID) return true;
      else return false;
    }).length
  ) {
    const this_socket = socket.id;
    //send this socket.id to socketID
    game_nsp.to(socketID).emit('given other player', this_socket);
    socket.emit('given other player', socketID);
    //remove both clients from clients
    clients = clients.filter(item => {
      if (item.id !== this_socket && item.id !== socketID) return true;
      else return false;
    });
    //send new client list
    socket.broadcast.emit('available games', clients);
  }
})

});
//end of connection event handler for game namespace


/*
socket event handlers for the deck builder namespace
*/
var db_nsp = io.of('/builder');

db_nsp.on('connection', function (socket) {

  socket.on('card query', function (cardName, edition, card_num, exact_flag) {
    if (exact_flag !== true && exact_flag !== false) {
      console.log('exact_flag was SQL injection?');
      return;
    }
    var query_text = "WHERE name = ? ORDER BY `name` ASC";
    if (!exact_flag) {
      if (cardName == null) {
        query_text = "ORDER BY RAND() LIMIT 1";
      }
      else {
        query_text = "WHERE name LIKE '%' ? '%' ORDER BY `name` ASC";
      }
    }
    con.query("SELECT name, set_id, card_id FROM card_img_info " + query_text, cardName, function (err, result, _fields) {
      if (err) throw err;
      if (result.length > 0) {
        var resultObj = JSON.parse(JSON.stringify(result)), set_id_array = [], card_id_array = [], card_name_array = [];
        for (var inc = 0; inc < resultObj.length; inc++) {
          set_id_array.push(resultObj[inc].set_id);
          card_id_array.push(resultObj[inc].card_id);
          card_name_array.push(resultObj[inc].name);
        }
        if (edition) {
          var inc = 0;
          while (inc < set_id_array.length) {
            if (set_id_array[inc] == edition && card_id_array[inc] == card_num) {
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
        if (resultObj[resultObj.length - 1].name !== resultObj[0].name) {
          socket.emit('card query result', set_id_array, card_id_array, card_name_array, 'Other Cards:');
          return;
        }
        socket.emit('card query result', set_id_array, card_id_array, card_name_array, 'Editions:');
      }
      else {
        socket.emit('card query result', null, null, card_name_array);
      }
    });
  });

  socket.on('get deck', function (deckName) {
    var deck = JSON.parse(fs.readFileSync("./media/decks/" + deckName + ".json", 'utf8'));
    socket.emit('given deck', deck);
  });

  socket.on('get deck options', function (serialized_id) {
    if (serialized_id) {
      var id = str_obj(serialized_id)['PHPSESSID'],
        queryStr = "SELECT data FROM sessions WHERE id = '" + id + "' AND data IS NOT NULL";
      con.query(queryStr, function (err, result, _fields) {
        if (result[0] && result[0].data) {
          var user = result[0].data.split('"')[1];
          if (user === "robrob") {
            socket.emit("robrob draft prize");
          }
          con.query("SELECT name FROM decks WHERE owner = '" + user + "'", function (err, result, _fields) {
            var options = JSON.parse(JSON.stringify(result));
            socket.emit('give deck options', options);
          });
        }
        else { socket.emit('give deck options', null); }
      });
    }
    else {
      con.query("SELECT name FROM decks", function (err, result, _fields) {
        var options = JSON.parse(JSON.stringify(result));
        socket.emit('give deck options', options);
      });
    }
  });

  socket.on('delete deck', function (deck_name) {
    fs.unlink('./media/decks/' + deck_name + '.json', function (err) {
      if (err) console.log("error while deleting: " + deck_name, err);
      else console.log(deck_name + ' deleted!');
    });
    con.query("DELETE FROM `decks` WHERE name = ?", deck_name, function (err, result, _fields) {
      if (err) console.log("error while deleting: " + deck_name + " from MySQL db", err);
      else console.log(deck_name + ' deleted from MySQL db!');
    });
  });

  socket.on('create new deck', function (deck_name, cookie_str) {

    if (cookie_str) {
      fs.open('./media/decks/' + deck_name + ".json", 'wx+', (err, fd) => {
        if (err) {
          console.log("error creating deck: " + deck_name + " on FS");
          socket.emit('deck creation fail', "Writing to Server File System Failed. Check that the deck name does not already exist.");
        }
        else {
          //var module_text = 'var deck = []; module.exports = deck;';
          fs.write(fd, '[]', (err) => {
            if (err) {
              console.log(err);
            }
            fs.close(fd, () => { });
          });
          console.log("Deck: " + deck_name + " created successfully on FS");

          //determine who the owner is
          var id = str_obj(cookie_str)['PHPSESSID'],
            queryStr = "SELECT data FROM sessions WHERE id = '" + id + "' AND data IS NOT NULL";
          con.query(queryStr, function (err, result, _fields) {
            if (result[0] && result[0].data) {
              var user = result[0].data.split('"')[1];

              //create deck in MySQL DB:
              con.query("INSERT INTO `decks` (`name`, `owner`) VALUES (?, ?)", [deck_name, user], function (err, result, _fields) {
                if (err) {
                  console.log("error while creating: " + deck_name + " in MySQL DB", err);
                  socket.emit('deck creation fail', 'Writing to the MySQL Database failed. :(');
                }
                else {
                  console.log(deck_name + ' created in MySQL DB!');
                  socket.emit('new deck created', deck_name);
                }
              });
            }
            else { socket.emit('deck creation fail', "Failed to verify your user account"); return; }
          });
        }
      });
    }
    else { socket.emit('deck creation fail', "Failed to verify your user account"); }
  });

  socket.on('save deck', (deck_array, deck_name) => {
    fs.open('./media/decks/' + deck_name + ".json", 'w+', (err, fd) => {
      if (err) {
        console.log("error saving deck: " + deck_name + " on FS");
        socket.emit('deck save fail', "Writing to Server File System Failed.");
      }
      else {
        deck_array = JSON.stringify(deck_array);
        //var module_text = 'var deck = ' + deck_array + '; module.exports = deck;';
        fs.write(fd, deck_array, (err) => {
          if (err) {
            console.log(err);
          }
          fs.close(fd, () => { });
        });
      }
    });
  });

  socket.on('rename deck', (old_name, new_name) => {
    fs.rename('./media/decks/' + old_name + '.json', './media/decks/' + new_name + '.json', (err) => {
      if (err)
        console.log(err);
      else {
        con.query("UPDATE `decks` SET `name` = ? WHERE `decks`.`name` = ?", [new_name, old_name], function (error) {
          if (error) {
            console.log("error while renaming: " + deck_name + " in MySQL DB", error);
          }
          else {
            socket.emit('deck renamed', old_name, new_name);
          }
        });
      }
    });
  });

});
//end of deck builder namespace connection event handler

http.listen(89, function () {
  console.log('Node web server listening on *:89');
});

//Global Functions

//turns cookie string into json
function str_obj(str) {
  str = str.split('; ');
  var result = {};
  for (var i = 0; i < str.length; i++) {
    var cur = str[i].split('=');
    result[cur[0]] = cur[1];
  }
  return result; //can minimize if never figure use for other cookie params
}

function sendDeck(choice, owner, opponent) {

  var deck = JSON.parse(fs.readFileSync("./media/decks/" + choice + ".json", 'utf8'));
  shuffle(deck);
  game_nsp.to(owner).emit('given deck', deck);
  var oCards2 = [];
  for (var inc = 0; inc < deck.length; inc++) {
    oCards2.push({ "name": "", "frontSrc": "frontSrc" });
  }
  game_nsp.to(opponent).emit('given opponent', oCards2);

};
