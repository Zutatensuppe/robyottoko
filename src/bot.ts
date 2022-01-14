import config from './config'
import Auth from './net/Auth'
import ModuleManager from './mod/ModuleManager'
import WebSocketServer from './net/WebSocketServer'
import WebServer from './WebServer'
import TwitchClientManager from './net/TwitchClientManager'
import ModuleStorage from './mod/ModuleStorage'
import { logger } from './fn'
import Users, { User } from './services/Users'
import Tokens from './services/Tokens'
import TwitchChannels from './services/TwitchChannels'
import Cache from './services/Cache'
import Db from './Db'
import Variables from './services/Variables'
import Mail from './net/Mail'
import EventHub from './EventHub'
import GeneralModule from './mod/modules/GeneralModule'
import SongrequestModule from './mod/modules/SongrequestModule'
import VoteModule from './mod/modules/VoteModule'
import SpeechToTextModule from './mod/modules/SpeechToTextModule'
import DrawcastModule from './mod/modules/DrawcastModule'
import AvatarModule from './mod/modules/AvatarModule'

import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)

const modules = [
  GeneralModule,
  SongrequestModule,
  VoteModule,
  SpeechToTextModule,
  DrawcastModule,
  AvatarModule,
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

const eventHub = new EventHub()
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
  // this function may only be called once per user!
  // changes to user will be handled by user_changed event
  const initForUser = async (user: User) => {
    const clientManager = new TwitchClientManager(
      config.twitch,
      db,
      user,
      twitchChannelRepo,
      moduleManager,
    )
    await clientManager.init('init')
    const variables = new Variables(db, user.id)
    const moduleStorage = new ModuleStorage(db, user.id)
    for (const moduleClass of modules) {
      moduleManager.add(user.id, new moduleClass(
        db,
        user,
        variables,
        clientManager,
        moduleStorage,
        cache,
        webServer,
        webSocketServer
      ))
    }

    eventHub.on('user_changed', async (changedUser: User) => {
      if (changedUser.id === user.id) {
        await clientManager.userChanged(changedUser)
        for (const mod of moduleManager.all(user.id)) {
          await mod.userChanged(changedUser)
        }
      }
    })
  }

  webSocketServer.listen()
  await webServer.listen()

  // one for each user
  for (const user of userRepo.all()) {
    await initForUser(user)
  }

  eventHub.on('user_registration_complete', async (user: User) => {
    await initForUser(user)
  })
}

run()

const log = logger(__filename)
const gracefulShutdown = (signal: 'SIGUSR2' | 'SIGINT' | 'SIGTERM') => {
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
