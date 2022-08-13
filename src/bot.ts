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
import Widgets from './services/Widgets'
import { refreshExpiredTwitchChannelAccessToken } from './oauth'

import { Bot } from './types'
import { ChatLogRepo } from './services/ChatLogRepo'
import fn from './fn'

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

const createBot = async (): Promise<Bot> => {
  const db = new Db(config.db.connectStr, config.db.patchesDir)
  await db.connect()
  await db.patch()

  const userRepo = new Users(db)
  const tokenRepo = new Tokens(db)
  const twitchChannelRepo = new TwitchChannels(db)
  const cache = new Cache(db)
  const auth = new Auth(userRepo, tokenRepo)
  const mail = new Mail(config.mail)
  const widgets = new Widgets(db, tokenRepo)
  const eventHub = mitt()
  const moduleManager = new ModuleManager()
  const webSocketServer = new WebSocketServer()
  const webServer = new WebServer()
  const chatLog = new ChatLogRepo(db)

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
    getConfig() { return config }
    getUsers() { return userRepo }
    getTokens() { return tokenRepo }
    getTwitchChannels() { return twitchChannelRepo }
    getCache() { return cache }
    getMail() { return mail }
    getAuth() { return auth }
    getWebServer() { return webServer }
    getWebSocketServer() { return webSocketServer }
    getWidgets() { return widgets }
    getEventHub() { return eventHub }
    getChatLog() { return chatLog }

    // user specific
    // -----------------------------------------------------------------

    sayFn(user: User, target: string | null): (msg: string) => void {
      const chatClient = this.getUserTwitchClientManager(user).getChatClient()
      return chatClient
        ? fn.sayFn(chatClient, target)
        : ((msg: string) => { log.info('say(), client not set, msg', msg) })
    }

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
        )
      }
      return this.userTwitchClientManagerInstances[user.id]
    }
  }
  return new BotImpl()
}

// this function may only be called once per user!
// changes to user will be handled by user_changed event
const initForUser = async (bot: Bot, user: User) => {
  const clientManager = bot.getUserTwitchClientManager(user)
  await clientManager.init('init')
  for (const moduleClass of modules) {
    bot.getModuleManager().add(user.id, await new moduleClass(bot, user))
  }

  let updateUserFrontendStatusTimeout: NodeJS.Timeout | null = null
  const updateUserFrontendStatus = async (): Promise<NodeJS.Timeout> => {
    if (updateUserFrontendStatusTimeout) {
      clearTimeout(updateUserFrontendStatusTimeout)
      updateUserFrontendStatusTimeout = null
    }
    const client = clientManager.getHelixClient()
    if (!client) {
      return setTimeout(updateUserFrontendStatus, 5 * SECOND)
    }

    // status for the user that should show in frontend
    // (eg. problems with their settings)
    // this only is relevant if the user is at the moment connected
    // to a websocket
    if (!bot.getWebSocketServer().isUserConnected(user.id)) {
      return setTimeout(updateUserFrontendStatus, 5 * SECOND)
    }
    const problems = []
    const twitchChannels = await bot.getTwitchChannels().allByUserId(user.id)
    for (const twitchChannel of twitchChannels) {
      const result = await refreshExpiredTwitchChannelAccessToken(
        twitchChannel,
        bot,
        user,
      )
      if (result.error) {
        log.error('Unable to validate or refresh OAuth token.')
        log.error(`user: ${user.name}, channel: ${twitchChannel.channel_name}, error: ${result.error}`)
        problems.push({
          message: 'access_token_invalid',
          details: {
            channel_name: twitchChannel.channel_name,
          },
        })
      } else if (result.refreshed) {
        const changedUser = await bot.getUsers().getById(user.id)
        if (changedUser) {
          bot.getEventHub().emit('access_token_refreshed', changedUser)
        } else {
          log.error(`oauth token refresh: user doesn't exist after saving it: ${user.id}`)
        }
      }
    }

    const data = { event: 'status', data: { problems } }
    bot.getWebSocketServer().notifyAll([user.id], 'core', data)
    return setTimeout(updateUserFrontendStatus, 1 * MINUTE)
  }
  updateUserFrontendStatusTimeout = await updateUserFrontendStatus()

  let updateUserStreamStatusTimeout: NodeJS.Timeout | null = null
  const updateUserStreamStatus = async (): Promise<NodeJS.Timeout> => {
    if (updateUserStreamStatusTimeout) {
      clearTimeout(updateUserStreamStatusTimeout)
      updateUserStreamStatusTimeout = null
    }
    const client = clientManager.getHelixClient()
    if (!client) {
      return setTimeout(updateUserFrontendStatus, 5 * SECOND)
    }
    const twitchChannels = await bot.getTwitchChannels().allByUserId(user.id)
    for (const twitchChannel of twitchChannels) {
      if (!twitchChannel.channel_id) {
        const channelId = await client.getUserIdByNameCached(twitchChannel.channel_name, bot.getCache())
        if (!channelId) {
          continue
        }
        twitchChannel.channel_id = channelId
      }
      const stream = await client.getStreamByUserId(twitchChannel.channel_id)
      twitchChannel.is_streaming = !!stream
      bot.getTwitchChannels().save(twitchChannel)
    }
    return setTimeout(updateUserStreamStatus, 5 * MINUTE)
  }
  updateUserStreamStatusTimeout = await updateUserStreamStatus()

  bot.getEventHub().on('wss_user_connected', async (socket: any /* Socket */) => {
    if (socket.user_id === user.id && socket.module === 'core') {
      updateUserFrontendStatusTimeout = await updateUserFrontendStatus()
      updateUserStreamStatusTimeout = await updateUserStreamStatus()
    }
  })
  bot.getEventHub().on('access_token_refreshed', async (changedUser: any /* User */) => {
    if (changedUser.id === user.id) {
      await clientManager.accessTokenRefreshed(changedUser)
      updateUserFrontendStatusTimeout = await updateUserFrontendStatus()
      updateUserStreamStatusTimeout = await updateUserStreamStatus()
      for (const mod of bot.getModuleManager().all(user.id)) {
        await mod.userChanged(changedUser)
      }
    }
  })
  bot.getEventHub().on('user_changed', async (changedUser: any /* User */) => {
    if (changedUser.id === user.id) {
      await clientManager.userChanged(changedUser)
      updateUserFrontendStatusTimeout = await updateUserFrontendStatus()
      updateUserStreamStatusTimeout = await updateUserStreamStatus()
      for (const mod of bot.getModuleManager().all(user.id)) {
        await mod.userChanged(changedUser)
      }
    }
  })
}

export const run = async () => {
  const bot = await createBot()

  // one for each user
  for (const user of await bot.getUsers().all()) {
    await initForUser(bot, user)
  }

  bot.getEventHub().on('user_registration_complete', async (user: any /* User */) => {
    await initForUser(bot, user)
  })

  // as the last step, start websocketserver and webserver
  // it needs to be the last step, because modules etc.
  // need to be set up in advance so that everything is registered
  // at the point of connection from outside
  bot.getWebSocketServer().listen(bot)
  await bot.getWebServer().listen(bot)

  const gracefulShutdown = (signal: 'SIGUSR2' | 'SIGINT' | 'SIGTERM') => {
    log.info(`${signal} received...`)

    log.info('shutting down webserver...')
    bot.getWebServer().close()

    log.info('shutting down websocketserver...')
    bot.getWebSocketServer().close()

    log.info('shutting down...')
    process.exit()
  }

  // used by nodemon
  process.once('SIGUSR2', function () {
    gracefulShutdown('SIGUSR2')
  });

  process.once('SIGINT', function (_code) {
    gracefulShutdown('SIGINT')
  });

  process.once('SIGTERM', function (_code) {
    gracefulShutdown('SIGTERM')
  });
}
