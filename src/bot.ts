import config from './config'
import Auth from './net/Auth'
import ModuleManager from './mod/ModuleManager'
import WebSocketServer from './net/WebSocketServer'
import WebServer from './WebServer'
import TwitchClientManager from './net/TwitchClientManager'
import ModuleStorage from './mod/ModuleStorage'
import { logger, setLogLevel } from './common/fn'
import Users, { User } from './services/Users'
import Tokens from './services/Tokens'
import TwitchChannels from './services/TwitchChannels'
import Cache from './services/Cache'
import Db from './Db'
import Variables from './services/Variables'
import Mail from './net/Mail'
import mitt from 'mitt'
import GeneralModule from './mod/modules/GeneralModule'
import SongrequestModule from './mod/modules/SongrequestModule'
import VoteModule from './mod/modules/VoteModule'
import SpeechToTextModule from './mod/modules/SpeechToTextModule'
import DrawcastModule from './mod/modules/DrawcastModule'
import AvatarModule from './mod/modules/AvatarModule'

import { Bot } from './types'

setLogLevel(config.log.level)
const log = logger('bot.ts')

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

const eventHub = mitt()
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

const userVariableInstances: Record<number, Variables> = {}
const userModuleStorageInstances: Record<number, ModuleStorage> = {}
const bot: Bot = {
  getDb: () => db,
  getTokens: () => tokenRepo,
  getCache: () => cache,
  getWebServer: () => webServer,
  getWebSocketServer: () => webSocketServer,

  // user specific
  // -----------------------------------------------------------------

  getUserVariables: (user: User) => {
    if (!userVariableInstances[user.id]) {
      userVariableInstances[user.id] = new Variables(db, user.id)
    }
    return userVariableInstances[user.id]
  },
  getUserModuleStorage: (user: User) => {
    if (!userModuleStorageInstances[user.id]) {
      userModuleStorageInstances[user.id] = new ModuleStorage(db, user.id)
    }
    return userModuleStorageInstances[user.id]
  },
}

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
    for (const moduleClass of modules) {
      moduleManager.add(user.id, new moduleClass(bot, user, clientManager))
    }

    eventHub.on('user_changed', async (changedUser: any /* User */) => {
      if (changedUser.id === user.id) {
        await clientManager.userChanged(changedUser)
        for (const mod of moduleManager.all(user.id)) {
          await mod.userChanged(changedUser)
        }
      }
    })

    const sendStatus = async () => {
      const client = clientManager.getHelixClient()
      if (!client) {
        setTimeout(sendStatus, 5000)
        return
      }

      // if the user is not connected through a websocket atm, dont
      // try to validate oauth tokens
      if (webSocketServer.sockets([user.id]).length === 0) {
        setTimeout(sendStatus, 5000)
        return
      }

      const problems = []
      const twitchChannels = twitchChannelRepo.allByUserId(user.id)
      for (const twitchChannel of twitchChannels) {
        if (!twitchChannel.access_token) {
          continue;
        }
        const resp = await client.validateOAuthToken(
          twitchChannel.channel_id,
          twitchChannel.access_token,
        )
        if (!resp.valid) {
          log.error(`Unable to validate OAuth token. user: ${user.name}: channel ${twitchChannel.channel_name}`)
          log.error(resp.data)
          problems.push(`Access token for channel ${twitchChannel.channel_name} is invalid.`)
        }
      }

      const data = { event: 'status', data: { problems } }
      webSocketServer.notifyAll([user.id], 'core', data)
      setTimeout(sendStatus, 5000)
    }
    sendStatus()
  }

  webSocketServer.listen()
  await webServer.listen()

  // one for each user
  for (const user of userRepo.all()) {
    await initForUser(user)
  }

  eventHub.on('user_registration_complete', async (user: any /* User */) => {
    await initForUser(user)
  })
}

run()

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
