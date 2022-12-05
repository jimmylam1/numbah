// Invite link: https://discord.com/api/oauth2/authorize?client_id=769054680159879208&permissions=0&scope=bot

var VERSION = "2.1";  // The current version of the bot. Include VERSION in git commit message!

/********************************
   Initiation stuff on startup
 ********************************/

require('dotenv').config();
const Discord = require('discord.js');
const fs = require('fs')
const bot = new Discord.Client({
    intents: ["GUILDS", "GUILD_MESSAGES"],
    makeCache: Discord.Options.cacheWithLimits({
        MessageManager: 0,
        ReactionManager: 0,
        PresenceManager: 0
    })
});
const TOKEN = process.env.TOKEN;

bot.login(TOKEN);

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
// -->         orange      blue       green      purple      gold     magenta     brown
var COLORS = ["#ffa500", "#1e90ff", "#228b22", "#800080", "#ffd700", "#ff00ff", "#8b4513"]
var COLOR_CNT = 0 // the current color index for COLORS 

var ON_OFF = 1; // 1 = on, 0 = off, for num!on/off command

var hasChanged = false
var usedHashes = [] // used by getColor()

bot.on('ready', () => {
    console.info(`Logged in as ${bot.user.tag}! verion ${VERSION}`);
    bot.user.setPresence({game: {name: `Guessing Game | !num help`}, type: "PLAYING"});
    if (fs.existsSync("saveData.json")) {
        let data = fs.readFileSync("saveData.json", "utf8")
        let parsedData = JSON.parse(data)
        PLAYERS = parsedData.game
        usedHashes = parsedData.usedHashes
    }

    //bot.user.setAvatar("./profile3.png");
});

/********************************
    Message response commands
 ********************************/

bot.on('messageCreate', msg => {
    // important, disable DMs
    if (msg.channel.type == "dm") {
        return
        // dm(msg)
    }
    // if (on_off(msg) == 1) {return} // ignore all commands if bot is off 

    // prevent bot from replying to other bots
    if (msg.author.bot) {return}

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
    var embedMsg = new Discord.MessageEmbed()
        .setColor("#ffdf00")
        .setTitle('Welcome to Numbah!')
        .setDescription("I can start a game where you try to guess a randomly generated number.\n\n" +
                        "`!num start <max>`\n\t\tStarts a game with an optional max value.\n" +
                                            "\t\tIf max is omitted, it will default to 10,000.\n" +
                        "`!num stop`\n\t\tStops a game"
                       )

    msg.channel.send({embeds: [embedMsg]}).catch(e => console.log("help error", e))
}
function initialize_new_player(msg, _max=10000) {
    /* creates a new player and adds it to the PLAYERS array */
    var player = {
        id: msg.author.id,
        min: 0,
        max: _max,
        answer: Math.floor(Math.random() * (_max+1)),
        count: 0,
        color: getColor(msg.author.id)
    }

    PLAYERS.push(player)
    COLOR_CNT++

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
function send_error_embed(msg, text) {
    var embedMsg = new Discord.MessageEmbed()
                    .setColor("#FF0000")
                    .setTitle(text)
    msg.channel.send({embeds: [embedMsg]}).catch(e => console.log("send error error", e))
    return embedMsg
}
function start(msg) {
    var player = 0;
    var text = ""
    
    if (get_player_idx(msg.author.id) < 0) {
        // default max
        if (msg.content == "!num start") {
            player = initialize_new_player(msg)
        }
        // user specified a max
        else {
            var start_max = parseInt(msg.content.substr(11))
            if (isNaN(start_max)) {
                send_error_embed(msg, msg.member.displayName + ", I couldn't understand your max value 😕")
                return
            }
            else if (start_max < 1 || start_max > 99999999) {
                send_error_embed(msg, msg.member.displayName + ", The max value is outside my range 😬")
                return
            }
            player = initialize_new_player(msg, start_max)
        }

        // player = PLAYERS[get_player_idx(msg.author.id)]
        text = msg.member.displayName + ", Guess a number between **" + player.min + "** and **" + player.max + "**"
    }
    else {
        // someone tried using !num start while they're already playing a game

        // player = PLAYERS[get_player_idx(msg.author.id)]
        text = msg.member.displayName + ", You're already playing a game! Use `!num stop` to stop."
        player = PLAYERS[get_player_idx(msg.author.id)]
    }

    var embedMsg = new Discord.MessageEmbed()
        .setColor(player.color)
        .setTitle(text)

    hasChanged = true
    msg.channel.send({embeds: [embedMsg]}).catch(e => console.log("start error", e))
}
function stop(msg) {
    var idx = get_player_idx(msg.author.id)
    if (idx >= 0) {
        var embedMsg = new Discord.MessageEmbed()
            .setColor(PLAYERS[idx].color)
            .setTitle(msg.member.displayName + ", I hope we can play again soon!")

        hasChanged = true
        msg.channel.send({embeds: [embedMsg]}).catch(e => console.log("Stop send error", e))
        PLAYERS.splice(idx, 1) // remove the player from the array
    }
}
function next_guess_values(player) {
    if (player.min == player.max) {
        return "You have one guess left: **" + player.min + "**!"
    }
    else if (player.max - player.min == 1) {
        return "Choose either **" + player.min + "** or **" + player.max +"**!"
    }
    else {
        return "Guess a number between **" + player.min + "** and **" + player.max + "**"
    }
}
function game(msg) {
    // exit if user did not enter just a number
    var in_text = msg.content.split(" ").join("") // replace spaces with ""
    if (parseInt(in_text).toString().length != in_text.length) {
        return
    }

    var idx = get_player_idx(msg.author.id)
    
    // exit if the current msg author is not in a game
    if (idx == -1) { 
        // msg.channel.send("ERROR 0")
        return
    } 

    // the game itself
    hasChanged = true

    var player = PLAYERS[idx];
    var guess = parseInt(msg);
    
    var text = ""; // the text message to send back
    player.count++;

    // check the guess with the player stats
    if ((guess < player.min) || (player.max < guess)) {
        text = "Out of bounds!\n" + next_guess_values(player)
        player.count--;
    } else if (guess < player.answer) {
        player.min = guess + 1
        text = "Higher!\n" + next_guess_values(player)
    } else if (guess > player.answer) {
        player.max = guess - 1
        text = "Lower!\n" + next_guess_values(player)
    } else {
        //msg.channel.send("Congradulations! You guessed my number!", {files: ["./trophy.png"]})

        // use "try" instead of "tries" if singular
        var tries = " tries!"
        if (player.count == 1) {
            tries = " try!"
        }

        // send back the congratulations message
        var embedMsg = new Discord.MessageEmbed()
            .setColor(player.color)
            .setTitle(msg.member.displayName + ", Congratulations! You guessed my number in " + player.count + tries)
            .setImage('https://media.discordapp.net/attachments/956682030387720262/1046913740777455626/trophy.png');

        msg.channel.send({embeds: [embedMsg]}).catch(e => console.log("game congrats error", e))

        PLAYERS.splice(idx, 1) // remove the player from the array
        return
    } 

    // send back higher/lower message
    var embedMsg = new Discord.MessageEmbed()
        .setColor(player.color)
        .setTitle(msg.member.displayName + ", attempt #" + player.count)
        .setDescription(text)

    msg.channel.send({embeds: [embedMsg]}).catch(e => console.log("help hl error", e))
}
function dm(msg) {
    message = "Sorry, I can't respond to DMs at the moment :("
    msg.author.send(message).catch(err => console.error(err));
    console.log("\n>>> Someone is DMing Numbah:" + msg.channel.recipient.username + "\n")
    return
}
function on_off(msg) {
    //    user:            jimmy                 
    const id_list = ["660521636482514944"];
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

/********************************
        Color Manager
 ********************************/

function getColor(name) {
    let hash = 122
    let nameLower = name.toLowerCase()
    for (let i = 0; i < nameLower.length; i++)
    {
        if (nameLower[i] == " ")
            continue
        
        hash += nameLower.charCodeAt(i) * 12
    }
    
    while (usedHashes.find(h => ((Math.abs(hash - h) + 256) % 256) < 10) != null)
        hash += 10;
    
    hash %= 256
    
    usedHashes.push(hash)

    if (usedHashes.length == 256)
        usedHashes = []
    
    let hue = hash / 256
    let saturation = (name == null || name == "" ? 0 : 0.1 + (hash >= 150 && hash <= 215 ? (hash >= 165 && hash <= 200 ? 0.4 : 0.6) : 0.8))
    let colorValue = 1

    return rgbToHex(hsvToRgb(hue, saturation, colorValue))
}

function hsvToRgb(h, s, v)
{
    let r = 0
	let g = 0
	let b = 0
	
	s = Math.max(0, Math.min(1, s))
	
    let i = Math.floor(h * 6)
    let f = h * 6 - i
    let p = v * (1 - s)
    let q = v * (1 - f * s)
    let t = v * (1 - (1 - f) * s)
	
    switch (i % 6)
	{
        case 0: r = v; g = t; b = p; break
        case 1: r = q; g = v; b = p; break
        case 2: r = p; g = v; b = t; break
        case 3: r = p; g = q; b = v; break
        case 4: r = t; g = p; b = v; break
        case 5: r = v; g = p; b = q; break
    }
	
    return {
		r: Math.round(r * 255),
		g: Math.round(g * 255),
		b: Math.round(b * 255)
	}
}

function rgbToHex(r, g, b)
{
	if (g == undefined)
		return rgbToHex(r.r, r.g, r.b)
	
    return "#" + ((1 << 24) + (Math.floor(r) << 16) + (Math.floor(g) << 8) + Math.floor(b)).toString(16).slice(1)
}


/********************************
        Interval Manager
 ********************************/

setInterval(() => {
    if (!hasChanged)
        return

    let data = {
        game: PLAYERS,
        usedHashes
    }

    fs.writeFileSync("saveData.json", JSON.stringify(data))
    hasChanged = false
}, 10000)
