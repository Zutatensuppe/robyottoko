import config from './config'
import Auth from './net/Auth'
import ModuleManager from './mod/ModuleManager'
import WebSocketServer from './net/WebSocketServer'
import WebServer from './net/WebServer'
import TwitchClientManager from './services/TwitchClientManager'
import { logger, setLogLevel } from './common/fn'
import { User } from './repo/Users'
import Cache from './services/Cache'
import Db from './DbPostgres'
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

import { Bot } from './types'
import fn from './fn'
import { Timer } from './Timer'
import { StreamStatusUpdater } from './services/StreamStatusUpdater'
import { FrontendStatusUpdater } from './services/FrontendStatusUpdater'
import { TwitchTmiClientManager } from './services/TwitchTmiClientManager'
import { Repos } from './repo/Repos'
import { Youtube } from './services/Youtube'
import { YoutubeApi } from './services/youtube/YoutubeApi'
import { Invidious } from './services/youtube/Indivious'
import { Canny } from './services/Canny'
import { Discord } from './services/Discord'
import { EmoteParser } from './services/EmoteParser'
import { TimeApi } from './services/TimeApi'
import { EffectApplier } from './effect/EffectApplier'

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

  const repos = new Repos(db)
  const cache = new Cache(db)
  const canny = new Canny(config.canny)
  const discord = new Discord(config.discord)
  const auth = new Auth(repos, canny)
  const widgets = new Widgets(repos)
  const timeApi = new TimeApi()
  const eventHub = mitt()
  const moduleManager = new ModuleManager()
  const webSocketServer = new WebSocketServer()
  const webServer = new WebServer()
  const twitchTmiClientManager = new TwitchTmiClientManager()
  const effectsApplier = new EffectApplier()
  const youtube = new Youtube(
    new YoutubeApi(config.youtube),
    new Invidious(),
    cache,
  )
  const emoteParser = new EmoteParser()

  class BotImpl implements Bot {
    private userTwitchClientManagerInstances: Record<number, TwitchClientManager> = {}
    private streamStatusUpdater: StreamStatusUpdater | null = null
    private frontendStatusUpdater: FrontendStatusUpdater | null = null

    getDb() { return db }
    getDiscord() { return discord }
    getBuildVersion() { return buildEnv.buildVersion }
    getBuildDate() { return buildEnv.buildDate }
    getModuleManager() { return moduleManager }
    getConfig() { return config }
    getRepos() { return repos }
    getCache() { return cache }
    getAuth() { return auth }
    getWebServer() { return webServer }
    getWebSocketServer() { return webSocketServer }
    getYoutube() { return youtube }
    getWidgets() { return widgets }
    getTimeApi() { return timeApi }
    getEventHub() { return eventHub }
    getEffectsApplier() { return effectsApplier }
    getStreamStatusUpdater(): StreamStatusUpdater {
      if (!this.streamStatusUpdater) {
        this.streamStatusUpdater = new StreamStatusUpdater(this)
      }
      return this.streamStatusUpdater
    }
    getFrontendStatusUpdater(): FrontendStatusUpdater {
      if (!this.frontendStatusUpdater) {
        this.frontendStatusUpdater = new FrontendStatusUpdater(this)
      }
      return this.frontendStatusUpdater
    }
    getTwitchTmiClientManager(): TwitchTmiClientManager { return twitchTmiClientManager }
    getCanny(): Canny { return canny }

    // user specific
    // -----------------------------------------------------------------

    sayFn(user: User): (msg: string) => void {
      const chatClient = this.getUserTwitchClientManager(user).getChatClient()
      return chatClient
        ? fn.sayFn(chatClient, user.twitch_login)
        : ((msg: string) => { log.info('say(), client not set, msg', msg) })
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

    getEmoteParser() {
      return emoteParser
    }
  }
  return new BotImpl()
}

// this function may only be called once per user!
// changes to user will be handled by user_changed event
const initForUser = async (bot: Bot, user: User) => {
  const clientManager = bot.getUserTwitchClientManager(user)
  const timer = new Timer()
  timer.reset()

  await clientManager.init('init')

  // note: even tho we await the init,
  //       we may not be connected to twitch chat or event sub yet
  //       because those connects are not awaited, or the server
  //       startup will take forever

  timer.split()
  log.debug(`initiating client manager took ${timer.lastSplitMs()}ms`)

  for (const moduleClass of modules) {
    bot.getModuleManager().add(user.id, await new moduleClass(bot, user))
  }

  timer.split()
  log.debug(`initiating all modules took ${timer.lastSplitMs()}ms`)

  bot.getFrontendStatusUpdater().addUser(user)
  bot.getStreamStatusUpdater().addUser(user)

  bot.getEventHub().on('wss_user_connected', async (socket: any /* Socket */) => {
    if (socket.user_id === user.id && socket.module === 'core') {
      await bot.getFrontendStatusUpdater().updateForUser(user.id)
      await bot.getStreamStatusUpdater().updateForUser(user.id)
    }
  })
  bot.getEventHub().on('access_token_refreshed', async (changedUser: any /* User */) => {
    if (changedUser.id === user.id) {
      await clientManager.accessTokenRefreshed(changedUser)
      await bot.getFrontendStatusUpdater().updateForUser(user.id)
      await bot.getStreamStatusUpdater().updateForUser(user.id)
      await bot.getModuleManager().updateForUser(user.id, changedUser)
    }
  })
  bot.getEventHub().on('user_changed', async (changedUser: any /* User */) => {
    if (changedUser.id === user.id) {
      await clientManager.userChanged(changedUser)
      await bot.getFrontendStatusUpdater().updateForUser(user.id)
      await bot.getStreamStatusUpdater().updateForUser(user.id)
      await bot.getModuleManager().updateForUser(user.id, changedUser)
    }
  })

  timer.split()
  log.debug(`init for user took ${timer.totalMs()}ms`)
}

export const run = async () => {
  const timer = new Timer()
  timer.reset()

  const bot = await createBot()

  timer.split()
  log.debug(`creating bot took ${timer.lastSplitMs()}ms`)

  // one for each user, all in parallel
  const initializers: Promise<void>[] = []
  for (const user of await bot.getRepos().user.all()) {
    initializers.push(initForUser(bot, user))
  }
  await Promise.all(initializers)

  timer.split()
  log.debug(`initializing users took ${timer.lastSplitMs()}ms`)

  bot.getEventHub().on('user_registration_complete', async (user: any /* User */) => {
    await initForUser(bot, user)
  })

  // as the last step, start websocketserver and webserver
  // it needs to be the last step, because modules etc.
  // need to be set up in advance so that everything is registered
  // at the point of connection from outside
  bot.getWebSocketServer().listen(bot)
  await bot.getWebServer().listen(bot)

  // start 'workers'
  bot.getFrontendStatusUpdater().start()
  bot.getStreamStatusUpdater().start()

  timer.split()
  log.debug(`starting server (websocket+web) took ${timer.lastSplitMs()}ms`)

  log.info(`bot started in ${timer.totalMs()}ms`)

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
  })

  process.once('SIGINT', function (_code) {
    gracefulShutdown('SIGINT')
  })

  process.once('SIGTERM', function (_code) {
    gracefulShutdown('SIGTERM')
  })
}
