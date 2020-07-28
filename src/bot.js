const tmi = require('tmi.js')
const fn = require('./fn.js')
const http = require('http')
const ws = require('ws')
const config = require('./config.js')

class ModuleManager {
  constructor(modules) {
    this.modules = modules
    this.instances = []
  }

  init (cm, websocket) {
    this.modules.forEach(m => {
      this.instances.push(m.create(cm.getClient(), new Storage(m.name), websocket, this))
    })
  }

  all () {
    return this.instances
  }
}

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

class WebsocketManager {
  constructor(moduleManager, conf) {
    this.server = new ws.Server(conf)
    this.server.on('connection', socket => {
      socket.isAlive = true
      socket.on('pong', function () { this.isAlive = true; })
      socket.on('message', (data) => {
        console.log(data)
        const d = JSON.parse(data)
        if (!d.event) {
          return
        }

        for (const module of moduleManager.all()) {
          const evts = module.getWsEvents()
          if (!evts) {
            continue;
          }
          if (evts[d.event]) {
            return evts[d.event](d)
          }
        }
      })

      for (const module of moduleManager.all()) {
        const evts = module.getWsEvents()
        if (!evts) {
          continue;
        }
        if (evts['conn']) {
          return evts['conn'](socket)
        }
      }
    })

    const self = this
    this.interval = setInterval(function ping() {
      self.server.clients.forEach(function each(socket) {
        if (socket.isAlive === false) {
          return socket.terminate();
        }
        socket.isAlive = false;
        socket.ping(() => {});
      });
    }, 30000)
    this.server.on('close', function close() {
      clearInterval(this.interval);
    });
  }

  notifyOne (data, socket) {
    if (socket.isAlive) {
      socket.send(JSON.stringify(data))
    }
  }

  notifyAll (data) {
    const self = this
    this.server.clients.forEach(function each(socket) {
      self.notifyOne(data, socket)
    })
  }
}

class ClientManager {
  constructor(moduleManager, conf) {
    this.client = new tmi.client(conf);
    this.client.on('message', async (target, context, msg, self) => {
      if (self) { return; } // Ignore messages from the bot
      for (const m of await moduleManager.all()) {
        await m.onMsg(client, target, context, msg);
      }
    })

    // Called every time the bot connects to Twitch chat
    this.client.on('connected', (addr, port) => {
      console.log(`* Connected to ${addr}:${port}`)
    })
    this.client.connect();
  }

  getClient() {
    return this.client
  }
}

class WebServerManager {
  constructor(moduleManager, conf) {
    const server = http.createServer(async (req, res) => {
      const handle = async (req, res) => {
        for (const module of await moduleManager.all()) {
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

    server.listen(conf.http.port, () => {
      console.log('server running')
    })
  }
}

class Bot
{
  constructor(moduleManager, websocketManager, clientManager, webServerManager) {
    this.moduleManager = moduleManager
    this.websocketManager = websocketManager
    this.clientManager = clientManager
    this.webServerManager = webServerManager

    this.moduleManager.init(cm, wss)
  }
}

const mm = new ModuleManager([
  require('./modules/core.js'),
  require('./modules/general.js'),
  require('./modules/sr.js'),
])

const wss = new WebsocketManager(mm, config.modules.sr.ws)
const cm = new ClientManager(mm, config)
const web = new WebServerManager(mm, config)

new Bot(mm, wss, cm, web)
