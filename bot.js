const tmi = require('tmi.js')
const fetch = require('node-fetch')

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

function getRandom(array) {
  return array[getRandomInt(0, array.length - 1)]
}

const fnRandom = (values) => () => getRandom(values)

const lookupWord = async (w, p = 1) => {
  return fetch('https://jisho.org/api/v1/search/words?keyword=' + encodeURIComponent(w) + '&page=' + p)
    .then(r => r.json())
    .then(j => j.data)
}

const timer = (t) => {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, t * 1000)
  })
}

const r = {
  word: null,
  solutions: [],
  lvl: 4,
  users: {
  },
  infos: [
    {search: '#jlpt-n1', pages: 173},
    {search: '#jlpt-n2', pages: 91},
    {search: '#jlpt-n3', pages: 89},
    {search: '#jlpt-n4', pages: 29},
    {search: '#jlpt-n5', pages: 33},
  ],
  nextWord: async () => {
    const info = r.infos[r.lvl - 1] // getRandom(r.infos[lvl])
    const page = getRandomInt(1, info.pages)
    const data = await lookupWord(info.search, page)
    const e = getRandom(data)
    r.word = e.slug
    r.solutions = [].concat(...e.senses.map(x => x.english_definitions)).map(s => s.toLowerCase())
    console.log(r.solutions)
  },
  solve: (msg, displayName) => {
    let lc = msg.toLowerCase()
    for (let i = 0; i < r.solutions.length; i++) {
      console.log(r.solutions[i])
      console.log(lc)
      if (r.solutions[i].indexOf(lc) !== -1) {
        let s = r.solutions
        let w = r.word
        r.word = null
        r.solutions = []
        r.users[displayName] = r.users[displayName] || 0
        r.users[displayName]+= 1
        return `Nice! ${w}: (${s.join(', ')})`
      }
    }
    return ''
  },
  lb: () => {
    const u = []
    Object.keys(r.users).forEach(k => {
      u.push({name: k, pts: r.users[k]})
    })

    return u.sort((e1, e2) => {
      return e1.pts > e2.pts ? 1 : -1
    }).map(e => `${e.name} (${e.pts}pts)`).join(', ')
  }
}

const cmds = {
  '!hyottoko': '俺はひょっとこ！ https://www.youtube.com/watch?v=DqTL1cU0sK8',
  '!discord': 'join Hyottoko Land! https://discord.gg/Fxy3TYC',
  '!commands': () => 'Commands: ' + Object.keys(cmds).filter(a => !['!commands'].includes(a)).join(' '),

  '!start': async () => {
    if (r.word === null) {
      await r.nextWord()
      return 'Ok, the next word is: ' + r.word
    } else {
      return 'You still have to solve: ' + r.word + ' (or use !skip to skip it)'
    }
  },
  '!stop': () => {
    r.word = null
    r.solutions = []
    return 'stopped the word game BibleThump'
  },
  '!score': () => {
    return r.lb()
  },

  '!skip': async () => {
    if (r.word === null) {
      return ''
    }

    w = r.word
    if (w) {
      r.word = null
      await r.nextWord()
      return 'Ok, I skipped "' + w + '" FeelsBadMan  The next word is: ' + r.word
    }
  },

  '!lvl': (params) => {
    if (r.word === null) {
      return ''
    }

    if (params.length === 0) {
      return `LVL: up to JLPT${r.lvl} (Chose a different level with !lvl [1-5])`
    } else {
      const newlvl = parseInt(params[0], 10)
      if (newlvl >= 1 && newlvl <= 5) {
        r.lvl = newlvl
      }
      return `Righty right! New Lvl: up to JLPT${r.lvl}`
    }
  },

  '!w': async (params) => {
    const phrase = params.join(' ')
    const data = await lookupWord(phrase)
    if (data.length === 0) {
      return `Sorry, I didn't find anything for "${phrase}"`
    }
    const e = data[0]

    let found
    if (phrase.match(/[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff66-\uff9f]/)) {
      found = e.senses[0].english_definitions.join(', ')
    } else {
      const j = e.japanese[0]
      found = j.word ? `${j.word} (${j.reading})` : j.reading
    }
    return `Phrase "${phrase}": ${found}`
  },

  '!atesoe': fnRandom([
    '大丈夫だよ〜　It\'s ok!',
    '私の靴下好きですか？ https://www.twitch.tv/atesoe/clip/FlaccidBeautifulPeachPogChamp Kappa',
    'oh no!',
  ]),
  '!achan': fnRandom([
    'ひ・み・つ'
  ]),
  '!sekkachi': fnRandom([
    'je voudrais un fromage StinkyCheese',
    'Yes, he is the byte leader ^_^',
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
async function onMessageHandler (target, context, msg, self) {
  if (self) { return; } // Ignore messages from the bot

  let solved =r.solve(msg, context['display-name'])
  if (solved !== '') {
    client.say(target, solved).catch(y => {})

    await r.nextWord()
    await timer(5)
    client.say(target, 'Ok, the next word is: ' + r.word).catch(y => {})
    return
  }


  // Remove whitespace from chat message
  const command = msg.trim().split(' ')
  const commandName = command[0]

  // If the command is known, let's execute it
  if (cmds[commandName]) {
    if (typeof cmds[commandName] === 'function') {
      msg = await cmds[commandName](command.slice(1))
      console.log(msg) 
    } else {
      msg = cmds[commandName]
    }
    client.say(target, msg).catch(y => {})
    console.log(`* Executed ${commandName} command`);
  } else {
    console.log(`* Unknown command ${commandName}`);
  }
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}

