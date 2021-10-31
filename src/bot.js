import config from './config.ts'
import Auth from './net/Auth'
import ModuleManager from './mod/ModuleManager'
import WebSocketServer from './net/WebSocketServer'
import WebServer from './WebServer'
import TwitchClientManager from './net/TwitchClientManager'
import ModuleStorage from './mod/ModuleStorage'
import { logger } from './fn.ts'
import Users from './services/Users.js'
import Tokens from './services/Tokens.js'
import TwitchChannels from './services/TwitchChannels.js'
import Cache from './services/Cache.js'
import Db from './Db.ts'
import Variables from './services/Variables.js'
import Mail from './net/Mail.js'
import { EventHub } from './EventHub.ts'
import GeneralModule from './mod/modules/GeneralModule'
import SongrequestModule from './mod/modules/SongrequestModule'
import VoteModule from './mod/modules/VoteModule'
import SpeechToTextModule from './mod/modules/SpeechToTextModule'
import DrawcastModule from './mod/modules/DrawcastModule'

import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)

const modules = [
  GeneralModule,
  SongrequestModule,
  VoteModule,
  SpeechToTextModule,
  DrawcastModule,
]

const db = new Db(config.db)
// make sure we are always on latest db version
db.patch(false)
const userRepo = new Users(db)
const tokenRepo = new Tokens(db)
const twitchChannelRepo = new TwitchChannels(db)
const cache = new Cache(db)
const auth = new Auth(userRepo, tokenRepo)
const mail = new Mail(config.mail)

const eventHub = EventHub()
const moduleManager = new ModuleManager()
const webSocketServer = new WebSocketServer(moduleManager, config.ws, auth)
const webServer = new WebServer(
  eventHub,
  db,
  userRepo,
  tokenRepo,
  mail,
  twitchChannelRepo,
  moduleManager,
  config.http,
  config.twitch,
  webSocketServer,
  auth
)

const run = async () => {
  const initForUser = (user) => {
    const variables = new Variables(db, user.id)
    const clientManager = new TwitchClientManager(
      eventHub,
      config.twitch,
      db,
      user,
      twitchChannelRepo,
      moduleManager,
      variables
    )
    const chatClient = clientManager.getChatClient()
    const helixClient = clientManager.getHelixClient()
    const moduleStorage = new ModuleStorage(db, user.id)
    for (const moduleClass of modules) {
      moduleManager.add(user.id, new moduleClass(
        db,
        user,
        variables,
        chatClient,
        helixClient,
        moduleStorage,
        cache,
        webServer,
        webSocketServer
      ))
    }
  }

  webSocketServer.listen()
  await webServer.listen()

  // one for each user
  for (const user of userRepo.all()) {
    initForUser(user)
  }

  eventHub.on('user_registration_complete', (user) => {
    initForUser(user)
  })
}

run()

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
