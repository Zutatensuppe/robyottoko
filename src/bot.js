const config = require('./config.js')
const net = require('./net')
const mod = require('./mod')
const { logger } = require('./fn.js')
const Users = require('./services/Users.js')
const Tokens = require('./services/Tokens.js')
const TwitchChannels = require('./services/TwitchChannels.js')
const Cache = require('./services/Cache.js')
const Db = require('./Db.js')

const db = new Db(config.db)
// make sure we are always on latest db version
db.patch(false)
const userRepo = new Users(db)
const tokenRepo = new Tokens(db)
const twitchChannelRepo = new TwitchChannels(db)
const cache = new Cache(db)
const auth = new net.Auth(userRepo, tokenRepo)

const moduleManager = new mod.ModuleManager()
const webSocketServer = new net.WebSocketServer(moduleManager, config.ws, auth)
const webServer = new net.WebServer(userRepo, twitchChannelRepo, moduleManager, config.http, webSocketServer, auth)
webSocketServer.listen()
webServer.listen()

// one for each user
for (const user of userRepo.all()) {
  const twitchChannels = twitchChannelRepo.allByUserId(user.id)
  const clientManager = new net.TwitchClientManager(user, twitchChannels, moduleManager)
  const chatClient = clientManager.getChatClient()
  const moduleStorage = new mod.ModuleStorage(db, user.id)
  for (const moduleClass of mod.modules) {
    moduleManager.add(user.id, new moduleClass(
      db,
      user,
      chatClient,
      moduleStorage,
      cache,
      webServer,
      webSocketServer
    ))
  }
}

const log = logger(__filename)
const gracefulShutdown = (signal) => {
  log.info(`${signal} received...`)

  log.info('shutting down webserver...')
  webServer.close()

  log.info('shutting down websocketserver...')
  webSocketServer.close()

  log.info('shutting down...')
  process.exit()
}

// used by nodemon
process.once('SIGUSR2', function () {
  gracefulShutdown('SIGUSR2')
});

process.once('SIGINT', function (code) {
  gracefulShutdown('SIGINT')
});

process.once('SIGTERM', function (code) {
  gracefulShutdown('SIGTERM')
});
