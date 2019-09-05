const tmi = require('tmi.js')

const opts = require('./config.js')

// Create a client with our options
const client = new tmi.client(opts);

// Register our event handlers (defined below)
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);

// Connect to Twitch:
client.connect();

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

const fnRandom = (values) => () => values[getRandomInt(0, values.length - 1)]

const cmds = {
  '!hyottoko': '俺はひょっとこ！ https://www.youtube.com/watch?v=DqTL1cU0sK8',
  '!discord': 'join Hyottoko Land! https://discord.gg/Fxy3TYC',

  '!atesoe': fnRandom([
    '大丈夫だよ〜　It\'s ok!',
    '私の靴下好きですか？ https://www.twitch.tv/atesoe/clip/FlaccidBeautifulPeachPogChamp Kappa',
  ]),
  '!achan': fnRandom([
    'ひ・み・つ'
  ]),
  '!hiro': fnRandom([
    'いいね〜、いいね〜！',
    'Almost fire! CurseLit CurseLit',
  ]),
  '!shares5': fnRandom([
    'LUL',
  ]),
  '!kingznaiver': fnRandom([
    'Yoshi! https://www.youtube.com/watch?v=lpTrDMSThHQ',
  ]),
}

// Called every time a message comes in
function onMessageHandler (target, context, msg, self) {
  if (self) { return; } // Ignore messages from the bot

  // Remove whitespace from chat message
  const commandName = msg.trim();

  // If the command is known, let's execute it
  if (cmds[commandName]) {
    if (typeof cmds[commandName] === 'function') {
      msg = cmds[commandName]()
      console.log(msg) 
    } else {
      msg = cmds[commandName]
    }
    client.say(target, msg).then(x => {
    }).catch(y => {
    })
    console.log(`* Executed ${commandName} command`);
  } else {
    console.log(`* Unknown command ${commandName}`);
  }
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}

