const tmi = require('tmi.js')
const opts = require('./config.js')
const client = new tmi.client(opts);
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);
client.connect();

const core = {
  allcmds: () => {
    const cmds = {}
    for (let i = 0; i < modules.length; i++) {
      Object.keys(modules[i].cmds || {}).forEach((key) => { cmds[key] = modules[i].cmds[key] })
    }
    return cmds
  },
  cmd: (context, msg) => {
    const command = msg.trim().split(' ')
    const name = command[0]
    const c = core.allcmds()[name] || null
    if (!c) {
      return c
    }
    const fn = typeof c === 'function' 
      ? async () => await c(context, command.slice(1))
      : () => c
    return {fn, name}
  },
  cmds: {
    '!commands': () => 'Commands: ' + Object.keys(core.allcmds()).filter(a => !['!commands'].includes(a)).join(' '),
  },
  onMsg: async (client, target, context, msg) => {
    const c = core.cmd(context, msg)
    if (c) {
      const r = await c.fn()
      client.say(target, r).catch(y => {})
      console.log(`* Executed ${c.name} command`)
      console.log(r)
    } else {
      console.log(msg)
    }
  }
}

const modules = [
  core,
  require('./general.js'),
  require('./wordgame.js'),
  require('./people.js'),
  require('./timer.js'),
]

modules.forEach(m => m.init && m.init(client))

async function onMessageHandler (target, context, msg, self) {
  if (self) { return; } // Ignore messages from the bot
  modules.forEach(async (m) => m.onMsg && await m.onMsg(client, target, context, msg))
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler (addr, port) {
  console.log(`* Connected to ${addr}:${port}`);
}

