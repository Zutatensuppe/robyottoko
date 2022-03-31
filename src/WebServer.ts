import { dirname } from 'path'
import { fileURLToPath } from 'url'
import cookieParser from 'cookie-parser'
import crypto from 'crypto'
import express, { NextFunction, Response } from 'express'
import multer from 'multer'
import path from 'path'
import Templates from './services/Templates'
import http from 'http'
import Db from './Db'
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

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const log = logger('WebServer.ts')

const widgetTemplate = (widget: string) => {
  if (process.env.WIDGET_DUMMY) {
    return process.env.WIDGET_DUMMY
  }
  return '../public/static/widgets/' + widget + '/index.html'
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

  pubUrl(target: string) {
    const row = this.db.get('pub', { target })
    let id
    if (!row) {
      do {
        id = nonce(6)
      } while (this.db.get('pub', { id }))
      this.db.insert('pub', { id, target })
    } else {
      id = row.id
    }
    return `${this.url}/pub/${id}`
  }

  widgetUrl(type: string, token: string) {
    return `${this.url}/widget/${type}/${token}/`
  }

  async listen() {
    const port = this.port
    const hostname = this.hostname
    const app = express()

    const templates = new Templates(__dirname)
    for (const widget of widgets) {
      await templates.add(widgetTemplate(widget.type))
    }
    await templates.add('templates/twitch_redirect_uri.html')

    app.get('/pub/:id', (req, res, next) => {
      const row = this.db.get('pub', {
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
    app.post('/api/upload', requireLoginApi, (req, res: Response) => {
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

    app.get('/api/conf', async (req, res: Response) => {
      res.send({
        wsBase: this.wss.connectstring(),
      })
    })

    app.get('/api/user/me', requireLoginApi, async (req: any, res: Response) => {
      res.send({
        user: req.user,
        widgetToken: req.userWidgetToken,
        pubToken: req.userPubToken,
        token: req.cookies['x-token'],
      })
    })

    app.post('/api/logout', requireLoginApi, async (req: any, res: Response) => {
      if (req.token) {
        this.auth.destroyToken(req.token)
        res.clearCookie("x-token")
      }
      res.send({ success: true })
    })

    app.get('/api/page/index', requireLoginApi, async (req: any, res: Response) => {
      res.send({
        widgets: widgets.map(w => {
          const url = this.widgetUrl(w.type, req.userPubToken)
          return {
            title: w.title,
            hint: w.hint,
            url: w.pub ? this.pubUrl(url) : url,
          }
        })
      })
    })

    app.post('/api/user/_reset_password', express.json(), async (req, res) => {
      const plainPass = req.body.pass || null
      const token = req.body.token || null
      if (!plainPass || !token) {
        res.status(400).send({ reason: 'bad request' })
        return
      }

      const tokenObj = this.tokenRepo.getByToken(token)
      if (!tokenObj) {
        res.status(400).send({ reason: 'bad request' })
        return
      }

      const originalUser = this.userRepo.getById(tokenObj.user_id)
      if (!originalUser) {
        res.status(404).send({ reason: 'user_does_not_exist' })
        return
      }

      const pass = fn.passwordHash(plainPass, originalUser.salt)
      const user = { id: originalUser.id, pass }
      this.userRepo.save(user)
      this.tokenRepo.delete(tokenObj.token)
      res.send({ success: true })
    })

    app.post('/api/user/_request_password_reset', express.json(), async (req, res) => {
      const email = req.body.email || null
      if (!email) {
        res.status(400).send({ reason: 'bad request' })
        return
      }

      const user = this.userRepo.get({ email, status: 'verified' })
      if (!user) {
        res.status(404).send({ reason: 'user not found' })
        return
      }

      const token = this.tokenRepo.createToken(user.id, 'password_reset')
      this.mail.sendPasswordResetMail({
        user: user,
        token: token,
      })
      res.send({ success: true })
    })

    app.post('/api/user/_resend_verification_mail', express.json(), async (req, res) => {
      const email = req.body.email || null
      if (!email) {
        res.status(400).send({ reason: 'bad request' })
        return
      }

      const user = this.db.get('user', { email })
      if (!user) {
        res.status(404).send({ reason: 'email not found' })
        return
      }

      if (user.status !== 'verification_pending') {
        res.status(400).send({ reason: 'already verified' })
        return
      }

      const token = this.tokenRepo.createToken(user.id, 'registration')
      this.mail.sendRegistrationMail({
        user: user,
        token: token,
      })
      res.send({ success: true })
    })

    app.post('/api/user/_register', express.json(), async (req, res) => {
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
      tmpUser = this.db.get('user', { email: user.email })
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
      tmpUser = this.db.get('user', { name: user.name })
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

      const userId = this.userRepo.createUser(user)
      if (!userId) {
        res.status(400).send({ reason: 'unable to create user' })
        return
      }
      const token = this.tokenRepo.createToken(userId, 'registration')
      this.mail.sendRegistrationMail({
        user: user,
        token: token,
      })
      res.send({ success: true })
    })

    app.post('/api/_handle-token', express.json(), async (req, res) => {
      const token = req.body.token || null
      if (!token) {
        res.status(400).send({ reason: 'invalid_token' })
        return
      }
      const tokenObj = this.tokenRepo.getByToken(token)
      if (!tokenObj) {
        res.status(400).send({ reason: 'invalid_token' })
        return
      }
      if (tokenObj.type === 'registration') {
        this.userRepo.save({ status: 'verified', id: tokenObj.user_id })
        this.tokenRepo.delete(tokenObj.token)
        res.send({ type: 'registration-verified' })

        // new user was registered. module manager should be notified about this
        // so that bot doesnt need to be restarted :O
        const user = this.userRepo.getById(tokenObj.user_id)
        if (user) {
          this.eventHub.emit('user_registration_complete', user)
        } else {
          log.error(`registration: user doesn't exist after saving it: ${tokenObj.user_id}`)
        }
        return
      }

      res.status(400).send({ reason: 'invalid_token' })
      return
    })

    app.get('/api/page/variables', requireLoginApi, async (req: any, res: Response) => {
      const variables = new Variables(this.db, req.user.id)
      res.send({ variables: variables.all() })
    })

    app.post('/api/save-variables', requireLoginApi, express.json(), async (req: any, res: Response) => {
      const variables = new Variables(this.db, req.user.id)
      variables.replace(req.body.variables || [])
      res.send()
    })

    app.get('/api/data/global', async (req: any, res: Response) => {
      const users = this.userRepo.all()
      res.send({
        registeredUserCount: users.filter(u => u.status === 'verified').length,
      })
    })

    app.get('/api/page/settings', requireLoginApi, async (req: any, res: Response) => {
      const user = this.userRepo.getById(req.user.id) as User
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
          groups: this.userRepo.getGroups(user.id)
        },
        twitchChannels: this.twitchChannelRepo.allByUserId(req.user.id),
      })
    })

    app.post('/api/save-settings', requireLoginApi, express.json(), async (req: any, res: Response) => {
      if (!req.user.groups.includes('admin')) {
        if (req.user.id !== req.body.user.id) {
          // editing other user than self
          res.status(401).send({ reason: 'not_allowed_to_edit_other_users' })
          return
        }
      }

      const originalUser = this.userRepo.getById(req.body.user.id)
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

      this.userRepo.save(user)
      this.twitchChannelRepo.saveUserChannels(user.id, twitch_channels)


      const changedUser = this.userRepo.getById(user.id)
      if (changedUser) {
        this.eventHub.emit('user_changed', changedUser)
      } else {
        log.error(`save-settings: user doesn't exist after saving it: ${user.id}`)
      }
      res.send()
    })

    // twitch calls this url after auth
    // from here we render a js that reads the token and shows it to the user
    app.get('/twitch/redirect_uri', async (req, res: Response) => {
      res.send(templates.render('templates/twitch_redirect_uri.html', {}))
    })
    app.post('/api/twitch/user-id-by-name', requireLoginApi, express.json(), async (req: any, res: Response) => {
      let clientId
      let clientSecret
      if (!req.user.groups.includes('admin')) {
        const u = this.userRepo.getById(req.user.id) as User
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
        res.send({ id: await client.getUserIdByName(req.body.name) })
      } catch (e) {
        res.status(500).send("Something went wrong!");
      }
    })

    app.post(
      '/twitch/event-sub/',
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
            this.db.insert('streams', {
              broadcaster_user_id: req.body.event.broadcaster_user_id,
              started_at: req.body.event.started_at,
            })
          } else if (req.body.subscription.type === 'stream.offline') {
            // get last started stream for broadcaster
            // if it exists and it didnt end yet set ended_at date
            const stream = this.db.get('streams', {
              broadcaster_user_id: req.body.event.broadcaster_user_id,
            }, [{ started_at: -1 }])
            if (!stream.ended_at) {
              this.db.update('streams', {
                ended_at: `${new Date().toJSON()}`,
              }, { id: stream.id })
            }
          }

          res.send()
          return
        }

        res.status(400).send({ reason: 'unhandled sub type' })
      })

    app.post('/api/auth', express.json(), async (req, res: Response) => {
      const user = this.auth.getUserByNameAndPass(req.body.user, req.body.pass)
      if (!user) {
        res.status(401).send({ reason: 'bad credentials' })
        return
      }

      const token = this.auth.getUserAuthToken(user.id)
      res.cookie('x-token', token, { maxAge: 1 * YEAR, httpOnly: true })
      res.send()
    })

    app.get('/widget/:widget_type/:widget_token/', async (req, res: Response, _next: NextFunction) => {
      const token = req.params.widget_token
      const user = this.auth.userFromWidgetToken(token)
        || this.auth.userFromPubToken(token)
      if (!user) {
        res.status(404).send()
        return
      }
      const type = req.params.widget_type
      log.debug(`/widget/:widget_type/:widget_token/`, type, token)
      if (widgets.findIndex(w => w.type === type) !== -1) {
        res.send(templates.render(widgetTemplate(type), {
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
