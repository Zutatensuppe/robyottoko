import { dirname } from 'path'
import { fileURLToPath } from 'url'
import cookieParser from 'cookie-parser'
import crypto from 'crypto'
import express, { NextFunction, Response } from 'express'
import cors from 'cors'
import multer from 'multer'
import path from 'path'
import Templates from './services/Templates'
import http from 'http'
import Db from './DbPostgres'
import fn from './fn'
import { nonce, logger, YEAR } from './common/fn'
import Tokens from './services/Tokens'
import TwitchHelixClient from './services/TwitchHelixClient'
import Users, { CreateUser, User } from './services/Users'
import Variables from './services/Variables'
import WebSocketServer from './net/WebSocketServer'
import { HttpConfig, MailService, TwitchConfig, UploadedFile } from './types'
import TwitchChannels, { TwitchChannel } from './services/TwitchChannels'
import ModuleManager from './mod/ModuleManager'
import Auth from './net/Auth'
import { UpdateUser } from './services/Users'
import { Emitter, EventType } from 'mitt'
import Cache from './services/Cache'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const log = logger('WebServer.ts')

const widgetTemplate = () => {
  if (process.env.WIDGET_DUMMY) {
    return process.env.WIDGET_DUMMY
  }
  return '../public/static/widgets/index.html'
}

interface WidgetDefinition {
  type: string
  title: string
  hint: string
  pub: boolean
}

const widgets: WidgetDefinition[] = [
  {
    type: 'sr',
    title: 'Song Request',
    hint: 'Browser source, or open in browser and capture window',
    pub: false,
  },
  {
    type: 'media',
    title: 'Media',
    hint: 'Browser source, or open in browser and capture window',
    pub: false,
  },
  {
    type: 'speech-to-text',
    title: 'Speech-to-Text',
    hint: 'Google Chrome + window capture',
    pub: false,
  },
  {
    type: 'speech-to-text_receive',
    title: 'Speech-to-Text (receive)',
    hint: 'Browser source, or open in browser and capture window',
    pub: false,
  },
  {
    type: 'avatar',
    title: 'Avatar (control)',
    hint: '???',
    pub: false,
  },
  {
    type: 'avatar_receive',
    title: 'Avatar (receive)',
    hint: 'Browser source, or open in browser and capture window',
    pub: false,
  },
  {
    type: 'drawcast_receive',
    title: 'Drawcast (Overlay)',
    hint: 'Browser source, or open in browser and capture window',
    pub: false,
  },
  {
    type: 'drawcast_draw',
    title: 'Drawcast (Draw)',
    hint: 'Open this to draw (or give to viewers to let them draw)',
    pub: true,
  },
  {
    type: 'drawcast_control',
    title: 'Drawcast (Control)',
    hint: 'Open this to control certain actions of draw (for example permit drawings)',
    pub: false,
  },
  {
    type: 'pomo',
    title: 'Pomo',
    hint: 'Browser source, or open in browser and capture window',
    pub: false,
  },
]

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
    this.handle = null
  }

  async getWidgetUrl(widgetType: string, userId: number): Promise<string> {
    return await this._widgetUrlByTypeAndUserId(widgetType, userId)
  }

  async getPublicWidgetUrl(widgetType: string, userId: number): Promise<string> {
    const url = await this._widgetUrlByTypeAndUserId(widgetType, userId)
    return await this._pubUrl(url)
  }

  async _pubUrl(target: string): Promise<string> {
    const row = await this.db.get('robyottoko.pub', { target })
    let id
    if (!row) {
      do {
        id = nonce(6)
      } while (await this.db.get('robyottoko.pub', { id }))
      await this.db.insert('robyottoko.pub', { id, target })
    } else {
      id = row.id
    }
    return `${this.url}/pub/${id}`
  }

  _widgetUrl(type: string, token: string): string {
    return `${this.url}/widget/${type}/${token}/`
  }

  async _createWidgetUrl(type: string, userId: number): Promise<string> {
    let t = await this.tokenRepo.getByUserIdAndType(userId, `widget_${type}`)
    if (t) {
      await this.tokenRepo.delete(t.token)
    }
    t = await this.tokenRepo.createToken(userId, `widget_${type}`)
    return `${this.url}/widget/${type}/${t.token}`
  }

  async _widgetUrlByTypeAndUserId(type: string, userId: number): Promise<string> {
    const t = await this.tokenRepo.getByUserIdAndType(userId, `widget_${type}`)
    if (t) {
      return this._widgetUrl(type, t.token)
    }
    return await this._createWidgetUrl(type, userId)
  }

  async listen() {
    const port = this.port
    const hostname = this.hostname
    const app = express()

    const templates = new Templates(__dirname)
    await templates.add(widgetTemplate())
    await templates.add('templates/twitch_redirect_uri.html')

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

    const verifyTwitchSignature = (req: any, res: any, next: NextFunction) => {
      const body = Buffer.from(req.rawBody, 'utf8')
      const msg = `${req.headers['twitch-eventsub-message-id']}${req.headers['twitch-eventsub-message-timestamp']}${body}`
      const hmac = crypto.createHmac('sha256', this.configTwitch.eventSub.transport.secret)
      hmac.update(msg)
      const expected = `sha256=${hmac.digest('hex')}`
      if (req.headers['twitch-eventsub-message-signature'] !== expected) {
        log.debug(req)
        log.error('bad message signature', {
          got: req.headers['twitch-eventsub-message-signature'],
          expected,
        })
        res.status(403).send({ reason: 'bad message signature' })
        return
      }

      return next()
    }

    const requireLoginApi = (req: any, res: any, next: NextFunction) => {
      if (!req.token) {
        res.status(401).send({})
        return
      }
      return next()
    }

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

    const uploadDir = './data/uploads'
    const storage = multer.diskStorage({
      destination: uploadDir,
      filename: function (req, file, cb) {
        cb(null, `${nonce(6)}-${file.originalname}`);
      }
    })
    const upload = multer({ storage }).single('file');
    app.use('/uploads', express.static(uploadDir))

    const apiRouter = express.Router()
    apiRouter.post('/upload', requireLoginApi, (req, res: Response) => {
      upload(req, res, (err) => {
        if (err) {
          log.error(err)
          res.status(400).send("Something went wrong!");
          return
        }
        if (!req.file) {
          log.error(err)
          res.status(400).send("Something went wrong!");
          return
        }

        const uploadedFile: UploadedFile = {
          fieldname: req.file.fieldname,
          originalname: req.file.originalname,
          encoding: req.file.encoding,
          mimetype: req.file.mimetype,
          destination: req.file.destination,
          filename: req.file.filename,
          filepath: req.file.path,
          size: req.file.size,
          urlpath: `/uploads/${encodeURIComponent(req.file.filename)}`,
        }
        res.send(uploadedFile)
      })
    })

    apiRouter.post('/widget/create_url', requireLoginApi, express.json(), async (req: any, res: Response) => {
      const type = req.body.type
      const pub = req.body.pub
      const url = await this._createWidgetUrl(type, req.user.id)
      res.send({
        url: pub ? (await this._pubUrl(url)) : url
      })
    })

    apiRouter.get('/conf', async (req, res: Response) => {
      res.send({
        wsBase: this.wss.connectstring(),
      })
    })

    apiRouter.get('/user/me', requireLoginApi, async (req: any, res: Response) => {
      res.send({
        user: req.user,
        token: req.cookies['x-token'],
      })
    })

    apiRouter.post('/logout', requireLoginApi, async (req: any, res: Response) => {
      if (req.token) {
        await this.auth.destroyToken(req.token)
        res.clearCookie("x-token")
      }
      res.send({ success: true })
    })

    apiRouter.get('/page/index', requireLoginApi, async (req: any, res: Response) => {
      const mappedWidgets = []
      for (const w of widgets) {
        const url = await this._widgetUrlByTypeAndUserId(w.type, req.user.id)
        mappedWidgets.push({
          type: w.type,
          pub: w.pub,
          title: w.title,
          hint: w.hint,
          url: w.pub ? (await this._pubUrl(url)) : url,
        })
      }
      res.send({ widgets: mappedWidgets })
    })

    apiRouter.post('/user/_reset_password', express.json(), async (req, res) => {
      const plainPass = req.body.pass || null
      const token = req.body.token || null
      if (!plainPass || !token) {
        res.status(400).send({ reason: 'bad request' })
        return
      }

      const tokenObj = await this.tokenRepo.getByTokenAndType(token, 'password_reset')
      if (!tokenObj) {
        res.status(400).send({ reason: 'bad request' })
        return
      }

      const originalUser = await this.userRepo.getById(tokenObj.user_id)
      if (!originalUser) {
        res.status(404).send({ reason: 'user_does_not_exist' })
        return
      }

      const pass = fn.passwordHash(plainPass, originalUser.salt)
      const user = { id: originalUser.id, pass }
      await this.userRepo.save(user)
      await this.tokenRepo.delete(tokenObj.token)
      res.send({ success: true })
    })

    apiRouter.post('/user/_request_password_reset', express.json(), async (req, res) => {
      const email = req.body.email || null
      if (!email) {
        res.status(400).send({ reason: 'bad request' })
        return
      }

      const user = await this.userRepo.get({ email, status: 'verified' })
      if (!user) {
        res.status(404).send({ reason: 'user not found' })
        return
      }

      const token = await this.tokenRepo.createToken(user.id, 'password_reset')
      this.mail.sendPasswordResetMail({ user, token })
      res.send({ success: true })
    })

    apiRouter.post('/user/_resend_verification_mail', express.json(), async (req, res) => {
      const email = req.body.email || null
      if (!email) {
        res.status(400).send({ reason: 'bad request' })
        return
      }

      const user = await this.db.get('robyottoko.user', { email })
      if (!user) {
        res.status(404).send({ reason: 'email not found' })
        return
      }

      if (user.status !== 'verification_pending') {
        res.status(400).send({ reason: 'already verified' })
        return
      }

      const token = await this.tokenRepo.createToken(user.id, 'registration')
      this.mail.sendRegistrationMail({ user, token })
      res.send({ success: true })
    })

    apiRouter.post('/user/_register', express.json(), async (req, res) => {
      const salt = fn.passwordSalt()
      const user: CreateUser = {
        name: req.body.user,
        pass: fn.passwordHash(req.body.pass, salt),
        salt: salt,
        email: req.body.email,
        status: 'verification_pending',
        tmi_identity_username: '',
        tmi_identity_password: '',
        tmi_identity_client_id: '',
        tmi_identity_client_secret: '',
      }
      let tmpUser
      tmpUser = await this.db.get('robyottoko.user', { email: user.email })
      if (tmpUser) {
        if (tmpUser.status === 'verified') {
          // user should use password reset function
          res.status(400).send({ reason: 'verified_mail_already_exists' })
        } else {
          // user should use resend registration mail function
          res.status(400).send({ reason: 'unverified_mail_already_exists' })
        }
        return
      }
      tmpUser = await this.db.get('robyottoko.user', { name: user.name })
      if (tmpUser) {
        if (tmpUser.status === 'verified') {
          // user should use password reset function
          res.status(400).send({ reason: 'verified_name_already_exists' })
        } else {
          // user should use resend registration mail function
          res.status(400).send({ reason: 'unverified_name_already_exists' })
        }
        return
      }

      const userId = await this.userRepo.createUser(user)
      if (!userId) {
        res.status(400).send({ reason: 'unable to create user' })
        return
      }
      const token = await this.tokenRepo.createToken(userId, 'registration')
      this.mail.sendRegistrationMail({ user, token })
      res.send({ success: true })
    })

    apiRouter.post('/_handle-token', express.json(), async (req, res) => {
      const token = req.body.token || null
      if (!token) {
        res.status(400).send({ reason: 'invalid_token' })
        return
      }
      const tokenObj = await this.tokenRepo.getByTokenAndType(token, 'registration')
      if (!tokenObj) {
        res.status(400).send({ reason: 'invalid_token' })
        return
      }
      await this.userRepo.save({ status: 'verified', id: tokenObj.user_id })
      await this.tokenRepo.delete(tokenObj.token)
      res.send({ type: 'registration-verified' })

      // new user was registered. module manager should be notified about this
      // so that bot doesnt need to be restarted :O
      const user = await this.userRepo.getById(tokenObj.user_id)
      if (user) {
        this.eventHub.emit('user_registration_complete', user)
      } else {
        log.error(`registration: user doesn't exist after saving it: ${tokenObj.user_id}`)
      }
      return
    })

    apiRouter.get('/page/variables', requireLoginApi, async (req: any, res: Response) => {
      const variables = new Variables(this.db, req.user.id)
      res.send({ variables: await variables.all() })
    })

    apiRouter.post('/save-variables', requireLoginApi, express.json(), async (req: any, res: Response) => {
      const variables = new Variables(this.db, req.user.id)
      await variables.replace(req.body.variables || [])
      res.send()
    })

    apiRouter.get('/data/global', async (req: any, res: Response) => {
      res.send({
        registeredUserCount: await this.userRepo.countVerifiedUsers(),
        streamingUserCount: await this.twitchChannelRepo.countUniqueUsersStreaming(),
      })
    })

    apiRouter.get('/page/settings', requireLoginApi, async (req: any, res: Response) => {
      const user = await this.userRepo.getById(req.user.id) as User
      res.send({
        user: {
          id: user.id,
          name: user.name,
          salt: user.salt,
          email: user.email,
          status: user.status,
          tmi_identity_username: user.tmi_identity_username,
          tmi_identity_password: user.tmi_identity_password,
          tmi_identity_client_id: user.tmi_identity_client_id,
          tmi_identity_client_secret: user.tmi_identity_client_secret,
          groups: await this.userRepo.getGroups(user.id)
        },
        twitchChannels: await this.twitchChannelRepo.allByUserId(req.user.id),
      })
    })

    apiRouter.post('/save-settings', requireLoginApi, express.json(), async (req: any, res: Response) => {
      if (!req.user.groups.includes('admin')) {
        if (req.user.id !== req.body.user.id) {
          // editing other user than self
          res.status(401).send({ reason: 'not_allowed_to_edit_other_users' })
          return
        }
      }

      const originalUser = await this.userRepo.getById(req.body.user.id)
      if (!originalUser) {
        res.status(404).send({ reason: 'user_does_not_exist' })
        return
      }

      const user: UpdateUser = {
        id: req.body.user.id,
      }
      if (req.body.user.pass) {
        user.pass = fn.passwordHash(req.body.user.pass, originalUser.salt)
      }
      if (req.body.user.email) {
        user.email = req.body.user.email
      }
      if (req.user.groups.includes('admin')) {
        user.tmi_identity_client_id = req.body.user.tmi_identity_client_id
        user.tmi_identity_client_secret = req.body.user.tmi_identity_client_secret
        user.tmi_identity_username = req.body.user.tmi_identity_username
        user.tmi_identity_password = req.body.user.tmi_identity_password
      }

      const twitch_channels = req.body.twitch_channels.map((channel: TwitchChannel) => {
        channel.user_id = user.id
        return channel
      })

      await this.userRepo.save(user)
      await this.twitchChannelRepo.saveUserChannels(user.id, twitch_channels)


      const changedUser = await this.userRepo.getById(user.id)
      if (changedUser) {
        this.eventHub.emit('user_changed', changedUser)
      } else {
        log.error(`save-settings: user doesn't exist after saving it: ${user.id}`)
      }
      res.send()
    })

    apiRouter.post('/twitch/user-id-by-name', requireLoginApi, express.json(), async (req: any, res: Response) => {
      let clientId
      let clientSecret
      if (!req.user.groups.includes('admin')) {
        const u = await this.userRepo.getById(req.user.id) as User
        clientId = u.tmi_identity_client_id || this.configTwitch.tmi.identity.client_id
        clientSecret = u.tmi_identity_client_secret || this.configTwitch.tmi.identity.client_secret
      } else {
        clientId = req.body.client_id
        clientSecret = req.body.client_secret
      }
      if (!clientId) {
        res.status(400).send({ reason: 'need client id' });
        return
      }
      if (!clientSecret) {
        res.status(400).send({ reason: 'need client secret' });
        return
      }

      try {
        // todo: maybe fill twitchChannels instead of empty array
        const client = new TwitchHelixClient(clientId, clientSecret, [])
        res.send({ id: await client.getUserIdByName(req.body.name, this.cache) })
      } catch (e) {
        res.status(500).send("Something went wrong!");
      }
    })

    apiRouter.post('/auth', express.json(), async (req, res: Response) => {
      const user = await this.auth.getUserByNameAndPass(req.body.user, req.body.pass)
      if (!user) {
        res.status(401).send({ reason: 'bad credentials' })
        return
      }

      const token = await this.auth.getUserAuthToken(user.id)
      res.cookie('x-token', token, { maxAge: 1 * YEAR, httpOnly: true })
      res.send()
    })

    const pubApiV1Router = express.Router()
    pubApiV1Router.use(cors())
    pubApiV1Router.get('/chatters', async (req, res: Response) => {
      if (!req.query.apiKey) {
        res.status(403).send({ ok: false, error: 'invalid api key' })
        return
      }
      const apiKey = String(req.query.apiKey)
      const t = await this.tokenRepo.getByTokenAndType(apiKey, 'api_key')
      if (!t) {
        res.status(403).send({ ok: false, error: 'invalid api key' })
        return
      }
      const user = await this.userRepo.getById(t.user_id)
      if (!user) {
        res.status(400).send({ ok: false, error: 'user_not_found' })
        return
      }
      if (!req.query.channel) {
        res.status(400).send({ ok: false, error: 'channel missing' })
        return
      }

      const channelName = String(req.query.channel)
      const helixClient = new TwitchHelixClient(
        this.configTwitch.tmi.identity.client_id,
        this.configTwitch.tmi.identity.client_secret,
        []
      )
      const channelId = await helixClient.getUserIdByName(channelName, this.cache)
      if (!channelId) {
        res.status(400).send({ ok: false, error: 'unable to determine channel id' })
        return
      }

      let dateSince: Date
      if (req.query.since) {
        try {
          dateSince = new Date(String(req.query.since))
        } catch (e) {
          res.status(400).send({ ok: false, error: 'unable to parse since' })
          return
        }
      } else {
        const stream = await helixClient.getStreamByUserId(channelId)
        if (!stream) {
          res.status(400).send({ ok: false, error: 'stream not online at the moment' })
          return
        }
        dateSince = new Date(stream.started_at)
      }

      const whereObject = this.db._buildWhere({
        broadcaster_user_id: channelId,
        created_at: { '$gte': dateSince },
      })
      const userNames = (await this.db._getMany(
        `select display_name from robyottoko.chat_log ${whereObject.sql} group by display_name`,
        whereObject.values
      )).map(r => r.display_name)
      res.status(200).send({ ok: true, data: { chatters: userNames, since: dateSince } })
    })

    apiRouter.use('/pub/v1', pubApiV1Router)

    app.use('/api', apiRouter)

    const twitchRouter = express.Router()
    // twitch calls this url after auth
    // from here we render a js that reads the token and shows it to the user
    twitchRouter.get('/redirect_uri', async (req, res: Response) => {
      res.send(templates.render('templates/twitch_redirect_uri.html', {}))
    })
    twitchRouter.post(
      '/event-sub/',
      express.json({ verify: (req: any, _res: Response, buf) => { req.rawBody = buf } }),
      verifyTwitchSignature,
      async (req, res) => {
        log.debug(req.body)
        log.debug(req.headers)

        if (req.headers['twitch-eventsub-message-type'] === 'webhook_callback_verification') {
          log.info(`got verification request, challenge: ${req.body.challenge}`)

          res.write(req.body.challenge)
          res.send()
          return
        }

        if (req.headers['twitch-eventsub-message-type'] === 'notification') {
          log.info(`got notification request: ${req.body.subscription.type}`)

          if (req.body.subscription.type === 'stream.online') {
            // insert new stream
            await this.db.insert('robyottoko.streams', {
              broadcaster_user_id: req.body.event.broadcaster_user_id,
              started_at: new Date(req.body.event.started_at),
            })
          } else if (req.body.subscription.type === 'stream.offline') {
            // get last started stream for broadcaster
            // if it exists and it didnt end yet set ended_at date
            const stream = await this.db.get('robyottoko.streams', {
              broadcaster_user_id: req.body.event.broadcaster_user_id,
            }, [{ started_at: -1 }])
            if (!stream.ended_at) {
              await this.db.update('robyottoko.streams', {
                ended_at: new Date(),
              }, { id: stream.id })
            }
          }

          res.send()
          return
        }

        res.status(400).send({ reason: 'unhandled sub type' })
      })
    app.use('/twitch', twitchRouter)

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
      const w = widgets.find(w => w.type === type)
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
      const indexFile = `${__dirname}/../../build/public/index.html`
      res.sendFile(path.resolve(indexFile));
    })

    app.all('/password-reset', async (_req, res: Response, _next: NextFunction) => {
      const indexFile = `${__dirname}/../../build/public/index.html`
      res.sendFile(path.resolve(indexFile));
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

      const indexFile = `${__dirname}/../../build/public/index.html`
      res.sendFile(path.resolve(indexFile));
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
