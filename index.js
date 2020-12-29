// Invite link: https://discord.com/api/oauth2/authorize?client_id=761673331388317717&permissions=34816&scope=bot

var VERSION = "1.0";  // The current version of the bot. Include VERSION in git commit message!

/********************************
   Initiation stuff on startup
 ********************************/

require('dotenv').config();
const Discord = require('discord.js');
const bot = new Discord.Client();
const TOKEN = process.env.TOKEN;

bot.login(TOKEN);

bot.on('ready', () => {
  console.info(`Logged in as ${bot.user.tag}! verion ${VERSION}`);
  bot.user.setPresence({game: {name: `Guessing Game | !num help`}, type: "PLAYING"});
  //bot.user.setAvatar("./profile3.png");
});

/********************************
        Global variables
 ********************************/
var _MIN = 0; // the minumum guess range
var _MAX = 5000; // the maximum guess range

/*  ** PLAYERS object **
    { id: user ID of discord user
      min: the minimum guess
      max: the max guess
      answer: random number
      count: the number of attempts
      color: the embed msg color to display
    }
*/
var PLAYERS = []; // list of player objects (from above)
// -->           red       orange     gold       green      blue       purple
var COLORS = ["#FF0000", "#ffa500", "#ffd700", "#228b22", "#1e90ff", "#800080"]

var ON_OFF = 1; // 1 = on, 0 = off, for num!on/off command

/********************************
    Message response commands
 ********************************/

bot.on('message', msg => {
    // important, disable DMs
    if (msg.channel.type == "dm") {
        dm(msg)
    }
    if (on_off(msg) == 1) {return} // ignore all commands if bot is off 

    // Commands
    else if (msg.content == "!num help") {
        help(msg)
    } 
    else if (msg.content.startsWith('!num start')) {
        start(msg)
    } 
    else if (msg.content == "!num stop") {
        stop(msg)
    } 
    else if (!isNaN(parseInt(msg))) {
        game(msg)
    } 
});

/********************************
       Response functions
 ********************************/
function help(msg) {
    var embedMsg = new Discord.RichEmbed()
        .setColor("#ffdf00")
        .setTitle('Welcome to Numbah!')
        .setDescription("I can start a game where you try to guess a randomly generated number.\n\n" +
                        "`!num start <max>`\n\t\tStarts a game with an optional max value.\n" +
                                            "\t\tIf max is omitted, it will default to 10,000.\n" +
                        "`!num stop`\n\t\tStops a game"
                       )

    msg.channel.send(embedMsg);
}
function initialize_new_player(msg, _max=10000) {
    /* creates a new player and adds it to the PLAYERS array */
    var player = {
                    id: msg.author.id,
                    min: 0,
                    max: _max,
                    answer: Math.floor(Math.random() * (_MAX+1)),
                    count: 0,
                    color: COLORS[0]
                }
    PLAYERS.push(player)

    // move the first elelemt in COLORS to end to cycle them
    COLORS.push(COLORS.splice(0,1))

    return player
}
function get_player_idx(id) {
    /* attempts to find the player in the PLAYERS array that
       matches the id paramter. returns -1 if player cannot 
       be found, otherwise returns the player object.
    */
    var array_len = PLAYERS.length;

    for (var i = 0; i < array_len; i++) {
        if (id == PLAYERS[i].id) {
            return i
        }
    }

    return -1;
}
function start(msg) {
    var player = null;
    var text = ""
    
    if (get_player_idx(msg.author.id) >= 0) {
        if (msg.content == "!num start") {
            // default max
            initialize_new_player(msg)
        }
        else {
            // user specified a max
            var start_max = parseInt(msg.content.substr(12))
            if (isNaN(start_max)) {
                var embedMsg = new Discord.RichEmbed()
                    .setColor("#FF0000")
                    .setTitle(msg.author.username + ", I couldn't understand your max value 😕")
                msg.channel.send(embedMsg);
                return
            }
            else if (start_max < 1 || start_max > 9999999) {
                var embedMsg = new Discord.RichEmbed()
                    .setColor("#FF0000")
                    .setTitle(msg.author.username + ", The max value is outside my range 😬")
                msg.channel.send(embedMsg);
                return
            }
            else {
                initialize_new_player(msg, start_max)
            }
        }

        player = PLAYERS[get_player_idx(msg.author.id)]
        text = msg.author.username + ", Guess a number between **" + player.min + "** and **" + player.max + "**"
    }
    else {
        player = PLAYERS[get_player_idx(msg.author.id)]
        text = msg.author.username + ", You're already playing a game!"
    }

    var embedMsg = new Discord.RichEmbed()
        .setColor(player.color)
        .setTitle(text)

    msg.channel.send(embedMsg);
}
function stop(msg) {
    var idx = get_player_idx(msg.author.id)
    if (idx >= 0) {
        var embedMsg = new Discord.RichEmbed()
            .setColor(PLAYERS[idx].color)
            .setTitle(msg.author.username + ", I hope we can play again soon!")

        msg.channel.send(embedMsg);
        PLAYERS.splice(idx, 1) // remove the player from the array
    }
}
function game(msg) {
    var idx = get_player_idx(msg.author.id)
    
    // exit if the current msg author is not in a game
    if (idx == -1) { 
        // msg.channel.send("ERROR 0")
        return
    } 

    // the game itself

    var player = PLAYERS[idx];
    var guess = parseInt(msg);
    
    var text = ""; // the text message to send back
    player.count++;

    // check the guess with the player stats
    if ((guess < player.min) || (player.max < guess)) {
        text = "Out of bounds! \nGuess a number between **" + player.min + "** and **" + player.max + "**"
    } else if (guess < player.answer) {
        player.min = guess + 1
        text = "Higher!\nGuess a number between **" + player.min + "** and **" + player.max + "**"
    } else if (guess > player.answer) {
        player.max = guess - 1
        text = "Lower!\nGuess a number between **" + player.min + "** and **" + player.max + "**"
    } else {
        //msg.channel.send("Congradulations! You guessed my number!", {files: ["./trophy.png"]})
        text = "Congradulations! You guessed my number!";

        // send back the congratulations message
        var attachment = new Discord.Attachment('./trophy.png', 'trophy.png');

        var embedMsg = new Discord.RichEmbed()
            .setColor("0ff517")
            .setTitle(msg.author.username + ", Congradulations! You guessed my number in " + player.count + " tries!")
            .attachFile(attachment)
            .setImage('attachment://trophy.png');

        msg.channel.send(embedMsg);

        PLAYERS.splice(idx, 1) // remove the player from the array
        return
    } 

    // send back higher/lower message
    var embedMsg = new Discord.RichEmbed()
        .setColor(player.color)
        .setTitle(msg.author.username + ", attempt #" + player.count)
        .setDescription(text)

    msg.channel.send(embedMsg);
}
function dm(msg) {
    message = "Sorry, I can't respond to DMs at the moment :("
    msg.author.send(message).catch(err => console.error(err));
    console.log("\n>>> Someone is DMing Numbah:" + msg.channel.recipient.username + "\n")
    return
}
function on_off(msg) {
    //    user:            jimmy                   pengu                walker
    const id_list = ["660521636482514944", "734214960984490013", "335603474156748811"];
    var msg_sender = msg.author.id; 
    var m = msg.content;

    // only do this if statement if msg.content is on/off AND is from a dev
    if ((m == "num!on" || m == "num!off") && id_list.indexOf(msg_sender) >= 0) {
        // turn off if it is on
        if (ON_OFF == 1) {
            ON_OFF = 0;
            bot.user.setPresence({status: 'dnd'});
            msg.channel.send("I am now **OFF**")
            .then(message => {
                setTimeout(function() {
                    message.delete();
                }, 5000);
            })

        } 
        else {
            ON_OFF = 1;
            bot.user.setPresence({status: 'online'});
            msg.channel.send("I am now **ON**")
            .then(message => {
                setTimeout(function() {
                    message.delete();
                }, 5000);
            })
        }
        return 1; 
    }
    // everything else, just check if bot is on or off
    else {
        if (ON_OFF == 1) {
            return 0
        } else {
            return 1
        }
    }
}
