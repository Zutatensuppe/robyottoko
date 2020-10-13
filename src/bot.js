const tmi = require('tmi.js')
const fn = require('./fn.js')
const config = require('./config.js')
const { Db } = require('./Db.js')
const { WebServer } = require('./WebServer.js')
const { WebSocketServer } = require('./WebSocketServer.js')
const { Auth } = require('./Auth.js')
const { Cache } = require('./Cache.js')
const { UserRepo } = require('./Repo/UserRepo.js')
const { TokenRepo } = require('./Repo/TokenRepo.js')
const { ModuleStorage } = require('./ModuleStorage.js')

class ModuleManager {
  constructor(modules) {
    this.modules = modules
    this.instances = {}
  }

  init (user, db, cache, cm, ws, wss) {
    this.instances[user.id] = []
    this.modules.forEach(m => {
      this.instances[user.id].push(m.create(
        user,
        cm.getClient(),
        new ModuleStorage(db, user.id, m.name),
        cache,
        ws,
        wss,
        this
      ))
    })
  }

  all (user_id) {
    return this.instances[user_id] || []
  }
}

class ClientManager {
  constructor(user, moduleManager) {
    this.client = new tmi.client({
      identity: {
        username: user.tmi_identity_username,
        password: user.tmi_identity_password,
        client_id: user.tmi_identity_client_id,
      },
      channels: user.twitch_channels.split(','),
      connection: {
        reconnect: true,
      }
    });

    this.client.on('message', async (target, context, msg, self) => {
      if (self) { return; } // Ignore messages from the bot
      console.log(target + '| ' + msg)
      const rawCmd = fn.parseCommand(msg)
      const say = fn.sayFn(this.client, target)

      for (const m of moduleManager.all(user.id)) {
        const commands = m.getCommands() || {}
        const cmdDef = commands[rawCmd.name] || null
        if (cmdDef && fn.mayExecute(context, cmdDef)) {
          const r = await cmdDef.fn(rawCmd, this.client, target, context, msg)
          console.log(target + '|', r)
          if (r) {
            say(r)
          }
          console.log(target + '| ' + `* Executed ${rawCmd.name} command`)
        }
        await m.onMsg(this.client, target, context, msg);
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

const db = new Db(config.db.file)
const userRepo = new UserRepo(db)
const tokenRepo = new TokenRepo(db)
const auth = new Auth(userRepo, tokenRepo)
const cache = new Cache(db)
const moduleManager = new ModuleManager([
  require('./modules/general.js'),
  require('./modules/sr.js'),
])

const webServer = new WebServer(moduleManager, config, auth)
webServer.listen()
const webSocketServer = new WebSocketServer(moduleManager, config.ws, auth)
webSocketServer.listen()

// one for each user
for (const user of userRepo.all()) {
  const clientManager = new ClientManager(user, moduleManager)
  moduleManager.init(user, db, cache, clientManager, webServer, webSocketServer)
}
