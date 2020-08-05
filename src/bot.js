const tmi = require('tmi.js')
const fn = require('./fn.js')
const config = require('./config.js')
const web = require('./web.js')
const { JsonStorage } = require('./storage.js')
const { userStorage } = require('./users.js')

class ModuleManager {
  constructor(modules) {
    this.modules = modules
    this.instances = {}
  }

  init (user, cm) {
    this.instances[user] = []
    this.modules.forEach(m => {
      this.instances[user].push(m.create(user, cm.getClient(), new ModuleStorage(user, m.name), this))
    })
  }

  all (user) {
    return this.instances[user] || []
  }
}

class ModuleStorage extends JsonStorage {
  constructor(user, module) {
    super(`./data/settings/${user}/${module}.data.json`);
  }
  load (def) {
    try {
      const data = super.load()
      return data ? Object.assign({}, def, data) : def
    } catch (e) {
      console.log(e)
      return def
    }
  }
}

class ClientManager {
  constructor(user, moduleManager) {
    this.client = new tmi.client(user.tmi);
    this.client.on('message', async (target, context, msg, self) => {
      if (self) { return; } // Ignore messages from the bot
      console.log(target + '| ' + msg)
      const rawCmd = fn.parseCommand(msg)
      const say = fn.sayFn(this.client, target)

      for (const m of await moduleManager.all(user.user)) {
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

const mm = new ModuleManager([
  require('./modules/general.js'),
  require('./modules/sr.js'),
])
web.init(mm, config)

// one for each user
for (let user of userStorage.load()) {
  const cm = new ClientManager(user, mm)
  mm.init(user.user, cm)
}
