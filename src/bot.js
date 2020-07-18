const tmi = require('tmi.js')
const fn = require('./fn.js')
const config = require('./config.js')
const client = new tmi.client(config);
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
  cmds: {
    '!commands': {
      fn: () => 'Commands: ' + Object.keys(core.allcmds()).filter(a => !['!commands'].includes(a)).join(' ')
    },
  },
  onMsg: async (client, target, context, msg) => {
    const command = fn.parseCommand(msg)
    let c = core.allcmds()[command.name] || null
    if (!c || !fn.mayExecute(context, c)) {
      console.log(msg)
      return
    }

    const r = await c.fn(command, client, target, context, msg)
    console.log(r)
    if (r) {
      fn.sayFn(client, target)(r)
    }
    console.log(`* Executed ${command.name} command`)
  }
}

const modules = [
  core,
  require('./modules/general.js'),
  require('./modules/sr.js'),
  // require('./modules/wordgame.js'),
  // require('./modules/people.js'),
  // require('./modules/timer.js'),
  // require('./modules/sr.js'),
]

modules.forEach(m => m.init && m.init(client))

async function onMessageHandler(target, context, msg, self) {
  if (self) { return; } // Ignore messages from the bot
  modules.forEach(async (m) => m.onMsg && await m.onMsg(client, target, context, msg))
}

// Called every time the bot connects to Twitch chat
function onConnectedHandler(addr, port) {
  console.log(`* Connected to ${addr}:${port}`)
}

const http = require('http')
const server = http.createServer(async (req, res) => {
  const handle = async (req, res) => {
    for (const module of modules) {
      if (!module.routes) {
        continue;
      }
      if (module.routes[req.url]) {
        return await module.routes[req.url](req, res)
      }
    }
  }

  const {code, type, body} = await handle(req, res) || {
    code: 404,
    type: 'text/plain',
    body: '404 Not Found'
  }

  res.statusCode = code
  res.setHeader('Content-Type', type)
  res.end(body)
})

server.listen(config.http.port, () => {
  console.log('server running')
})
