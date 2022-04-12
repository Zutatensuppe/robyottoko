import config from './config'
import Auth from './net/Auth'
import ModuleManager from './mod/ModuleManager'
import WebSocketServer from './net/WebSocketServer'
import WebServer from './WebServer'
import TwitchClientManager from './net/TwitchClientManager'
import ModuleStorage from './mod/ModuleStorage'
import { logger, MINUTE, SECOND, setLogLevel } from './common/fn'
import Users, { User } from './services/Users'
import Tokens from './services/Tokens'
import TwitchChannels from './services/TwitchChannels'
import Cache from './services/Cache'
import Db from './DbPostgres'
import Variables from './services/Variables'
import Mail from './net/Mail'
import mitt from 'mitt'
import GeneralModule from './mod/modules/GeneralModule'
import SongrequestModule from './mod/modules/SongrequestModule'
import VoteModule from './mod/modules/VoteModule'
import SpeechToTextModule from './mod/modules/SpeechToTextModule'
import DrawcastModule from './mod/modules/DrawcastModule'
import AvatarModule from './mod/modules/AvatarModule'
import PomoModule from './mod/modules/PomoModule'
import buildEnv from './buildEnv'

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
  PomoModule,
]

const run = async () => {
  const db = new Db(config.db.connectStr, config.db.patchesDir)
  await db.connect()
  await db.patch()

  // const db = new Db(config.db)
  // // make sure we are always on latest db version
  // db.patch(false)
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

  class BotImpl implements Bot {
    private userVariableInstances: Record<number, Variables> = {}
    private userModuleStorageInstances: Record<number, ModuleStorage> = {}
    private userTwitchClientManagerInstances: Record<number, TwitchClientManager> = {}

    constructor() {
      // pass
    }

    getBuildVersion() { return buildEnv.buildVersion }
    getBuildDate() { return buildEnv.buildDate }
    getModuleManager() { return moduleManager }
    getDb() { return db }
    getTokens() { return tokenRepo }
    getCache() { return cache }
    getWebServer() { return webServer }
    getWebSocketServer() { return webSocketServer }

    // user specific
    // -----------------------------------------------------------------

    getUserVariables(user: User) {
      if (!this.userVariableInstances[user.id]) {
        this.userVariableInstances[user.id] = new Variables(this.getDb(), user.id)
      }
      return this.userVariableInstances[user.id]
    }

    getUserModuleStorage(user: User) {
      if (!this.userModuleStorageInstances[user.id]) {
        this.userModuleStorageInstances[user.id] = new ModuleStorage(this.getDb(), user.id)
      }
      return this.userModuleStorageInstances[user.id]
    }

    getUserTwitchClientManager(user: User) {
      if (!this.userTwitchClientManagerInstances[user.id]) {
        this.userTwitchClientManagerInstances[user.id] = new TwitchClientManager(
          this,
          user,
          config.twitch,
          twitchChannelRepo,
        )
      }
      return this.userTwitchClientManagerInstances[user.id]
    }
  }
  const bot = new BotImpl()

  // this function may only be called once per user!
  // changes to user will be handled by user_changed event
  const initForUser = async (user: User) => {
    const clientManager = bot.getUserTwitchClientManager(user)
    await clientManager.init('init')
    for (const moduleClass of modules) {
      moduleManager.add(user.id, await new moduleClass(bot, user))
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
        setTimeout(sendStatus, 5 * SECOND)
        return
      }

      // if the user is not connected through a websocket atm, dont
      // try to validate oauth tokens
      if (webSocketServer.sockets([user.id]).length === 0) {
        setTimeout(sendStatus, 5 * SECOND)
        return
      }

      const problems = []
      const twitchChannels = await twitchChannelRepo.allByUserId(user.id)
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
          problems.push({
            message: 'access_token_invalid',
            details: {
              channel_name: twitchChannel.channel_name,
            },
          })
        }
      }

      const data = { event: 'status', data: { problems } }
      webSocketServer.notifyAll([user.id], 'core', data)
      setTimeout(sendStatus, 1 * MINUTE)
    }
    sendStatus()
  }

  webSocketServer.listen()
  await webServer.listen()

  // one for each user
  for (const user of await userRepo.all()) {
    await initForUser(user)
  }

  eventHub.on('user_registration_complete', async (user: any /* User */) => {
    await initForUser(user)
  })

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
}

run()
