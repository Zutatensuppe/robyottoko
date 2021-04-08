const config = require('./config.js')
const net = require('./net')
const storage = require('./storage')
const mod = require('./mod')

const db = new storage.Db(config.db.file)
const userRepo = new storage.UserRepo(db)
const tokenRepo = new storage.TokenRepo(db)
const auth = new net.Auth(userRepo, tokenRepo)
const cache = new storage.Cache(db)

const moduleManager = new mod.ModuleManager()
const webServer = new net.WebServer(db, moduleManager, config, auth)
webServer.listen()
const webSocketServer = new net.WebSocketServer(moduleManager, config.ws, auth)
webSocketServer.listen()

// one for each user
for (const user of userRepo.all()) {
  const clientManager = new net.TwitchClientManager(db, user, moduleManager)
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

const gracefulShutdown = (signal) => {
  console.log(`${signal} received...`)

  console.log('shutting down webserver...')
  webServer.close()

  console.log('shutting down websocketserver...')
  webSocketServer.close()

  console.log('shutting down...')
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
