const tmi = require('tmi.js')
const fn = require('./fn.js')
const ws = require('ws')
const config = require('./config.js')
const client = new tmi.client(config);
client.on('message', onMessageHandler);
client.on('connected', onConnectedHandler);
client.connect();

const core = {
  name: 'core',
  allcmds: () => {
    const cmds = {}
    for (let i = 0; i < modules.length; i++) {
      Object.keys(modules[i].getCommands() || {}).forEach((key) => { cmds[key] = modules[i].cmds[key] })
    }
    return cmds
  },
  getRoutes: () => false,
  getWsEvents: () => false,
  getCommands: () => ({
    '!commands': {
      fn: () => 'Commands: ' + Object.keys(core.allcmds()).filter(a => !['!commands'].includes(a)).join(' ')
    },
  }),
  onMsg: async (client, target, context, msg) => {
    const command = fn.parseCommand(msg)
    const cmd = core.allcmds()[command.name] || null
    if (!cmd || !fn.mayExecute(context, cmd)) {
      console.log(msg)
      return
    }

    const r = await cmd.fn(command, client, target, context, msg)
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


class Storage {
  constructor(module) {
    this.module = module
  }
  save (data) {
    return fn.save(this.module, data)
  }
  load (def) {
    return fn.load(this.module, def)
  }
}

const _wss = new ws.Server(config.modules.sr.ws)
_wss.on('connection', ws => {
  ws.isAlive = true
  ws.on('pong', function () { this.isAlive = true; })
  ws.on('message', (data) => {
    console.log(data)
    const d = JSON.parse(data)
    if (!d.event) {
      return
    }

    for (const module of modules) {
      const evts = module.getWsEvents()
      if (!evts) {
        continue;
      }
      if (evts[d.event]) {
        return evts[d.event](d)
      }
    }
  })

  for (const module of modules) {
    const evts = module.getWsEvents()
    if (!evts) {
      continue;
    }
    if (evts['conn']) {
      return evts['conn'](ws)
    }
  }
})
const interval = setInterval(function ping() {
  _wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping(() => {});
  });
}, 30000)
_wss.on('close', function close() {
  clearInterval(interval);
});

const notifyOne = (data, ws) => {
  if (ws.isAlive) {
    ws.send(JSON.stringify(data))
  }
}
const notifyAll = (data) => {
  _wss.clients.forEach(function each(ws) {
    notifyOne(data, ws)
  })
}

const _websocket = {
  notifyOne,
  notifyAll
};

modules.forEach(m => m.init && m.init(client, new Storage(m.name), _websocket))

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
      const routes = module.getRoutes()
      if (!routes) {
        continue;
      }
      if (routes[req.url]) {
        return await routes[req.url](req, res)
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
