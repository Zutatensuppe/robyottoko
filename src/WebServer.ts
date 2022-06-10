import { dirname } from 'path'
import { fileURLToPath } from 'url'
import cookieParser from 'cookie-parser'
import express, { NextFunction, Response } from 'express'
import path from 'path'
import Templates from './services/Templates'
import http from 'http'
import Db from './DbPostgres'
import { logger } from './common/fn'
import Tokens from './services/Tokens'
import Users from './services/Users'
import WebSocketServer from './net/WebSocketServer'
import { HttpConfig, MailService, TwitchConfig } from './types'
import TwitchChannels from './services/TwitchChannels'
import ModuleManager from './mod/ModuleManager'
import Auth from './net/Auth'
import { Emitter, EventType } from 'mitt'
import Cache from './services/Cache'
import Widgets from './services/Widgets'
import { createRouter as createTwitchRouter } from './web_routes/twitch'
import { createRouter as createApiRouter } from './web_routes/api'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const log = logger('WebServer.ts')

const widgetTemplate = () => {
  if (process.env.WIDGET_DUMMY) {
    return process.env.WIDGET_DUMMY
  }
  return '../public/static/widgets/index.html'
}

class WebServer {
  private handle: http.Server | null
  private eventHub: Emitter<Record<EventType, unknown>>
  private db: Db
  private cache: Cache
  private userRepo: Users
  private tokenRepo: Tokens
  private mail: MailService
  private twitchChannelRepo: TwitchChannels
  private moduleManager: ModuleManager
  private port: number
  private hostname: string
  private url: string
  private configTwitch: TwitchConfig
  private wss: WebSocketServer
  private auth: Auth
  private widgets: Widgets

  constructor(
    eventHub: Emitter<Record<EventType, unknown>>,
    db: Db,
    cache: Cache,
    userRepo: Users,
    tokenRepo: Tokens,
    mail: MailService,
    twitchChannelRepo: TwitchChannels,
    moduleManager: ModuleManager,
    configHttp: HttpConfig,
    configTwitch: TwitchConfig,
    wss: WebSocketServer,
    auth: Auth,
    widgets: Widgets,
  ) {
    this.eventHub = eventHub
    this.db = db
    this.cache = cache
    this.userRepo = userRepo
    this.tokenRepo = tokenRepo
    this.mail = mail
    this.twitchChannelRepo = twitchChannelRepo
    this.moduleManager = moduleManager
    this.port = configHttp.port
    this.hostname = configHttp.hostname
    this.url = configHttp.url
    this.configTwitch = configTwitch
    this.wss = wss
    this.auth = auth
    this.widgets = widgets
    this.handle = null
  }

  async listen() {
    const port = this.port
    const hostname = this.hostname
    const app = express()

    const templates = new Templates(__dirname)
    await templates.add(widgetTemplate())
    await templates.add('templates/twitch_redirect_uri.html')

    const indexFile = path.resolve(`${__dirname}/../../build/public/index.html`)

    app.get('/pub/:id', async (req, res, _next) => {
      const row = await this.db.get('robyottoko.pub', {
        id: req.params.id,
      })
      if (row && row.target) {
        req.url = row.target
        // @ts-ignore
        req.app.handle(req, res)
        return
      }
      res.status(404).send()
    })

    const requireLogin = (req: any, res: any, next: NextFunction) => {
      if (!req.token) {
        if (req.method === 'GET') {
          res.redirect(302, '/login')
        } else {
          res.status(401).send('not allowed')
        }
        return
      }
      return next()
    }

    app.use(cookieParser())
    app.use(this.auth.addAuthInfoMiddleware())
    app.use('/', express.static('./build/public'))
    app.use('/static', express.static('./public/static'))
    app.use('/uploads', express.static('./data/uploads'))

    app.use('/api', createApiRouter(
      this.eventHub,
      this.db,
      this.tokenRepo,
      this.userRepo,
      this.mail,
      this.wss,
      this.auth,
      this.configTwitch,
      this.cache,
      this.widgets,
      this.twitchChannelRepo,
    ))

    app.use('/twitch', createTwitchRouter(
      this.eventHub,
      this.db,
      templates,
      this.configTwitch,
      this.url,
      this.userRepo,
      this.twitchChannelRepo,
      this.cache,
    ))

    app.get('/widget/:widget_type/:widget_token/', async (req, res: Response, _next: NextFunction) => {
      const type = req.params.widget_type
      const token = req.params.widget_token
      const user = (await this.auth.userFromWidgetToken(token, type))
        || (await this.auth.userFromPubToken(token))
      if (!user) {
        res.status(404).send()
        return
      }
      log.debug(`/widget/:widget_type/:widget_token/`, type, token)
      const w = this.widgets.getWidgetDefinitionByType(type)
      if (w) {
        res.send(templates.render(widgetTemplate(), {
          widget: w.type,
          title: w.title,
          wsUrl: this.wss.connectstring(),
          widgetToken: token,
        }))
        return
      }
      res.status(404).send()
    })

    app.all('/login', async (_req, res: Response, _next: NextFunction) => {
      res.sendFile(indexFile);
    })

    app.all('/password-reset', async (_req, res: Response, _next: NextFunction) => {
      res.sendFile(indexFile);
    })

    app.all('*', requireLogin, express.json({ limit: '50mb' }), async (req: any, res: Response, next: NextFunction) => {
      const method = req.method.toLowerCase()
      const key = req.url
      for (const m of this.moduleManager.all(req.user.id)) {
        const map = m.getRoutes()
        if (map && map[method] && map[method][key]) {
          await map[method][key](req, res, next)
          return
        }
      }

      res.sendFile(indexFile);
    })

    this.handle = app.listen(
      port,
      hostname,
      () => log.info(`server running on http://${hostname}:${port}`)
    )
  }
  close() {
    if (this.handle) {
      this.handle.close()
    }
  }
}

export default WebServer
