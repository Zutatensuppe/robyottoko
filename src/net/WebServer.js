import path from 'path'
import fn from '../fn.js'
import crypto from 'crypto'
import multer from 'multer'
import express from 'express'
import cookieParser from 'cookie-parser'

import TwitchHelixClient from '../services/TwitchHelixClient.js'
import Db from '../Db.js'
import EventHub from '../EventHub.js'
import Users from '../services/Users.js'
import Tokens from '../services/Tokens.js'
import Mail from '../net/Mail.js'
import WebSocketServer from './WebSocketServer.js'
import Variables from '../services/Variables.js'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const log = fn.logger(__filename)

class WebServer {
  constructor(
    /** @type EventHub */ eventHub,
    /** @type Db */ db,
    /** @type Users */ userRepo,
    /** @type Tokens */ tokenRepo,
    /** @type Mail */ mail,
    twitchChannelRepo,
    moduleManager,
    configHttp,
    configTwitch,
    /** @type WebSocketServer */ wss,
    auth
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
    this.twitchWebhookSecret = configTwitch.eventSub.transport.secret
    this.wss = wss
    this.auth = auth
    this.handle = null
  }

  pubUrl(/** @type string */ target) {
    const row = this.db.get('pub', { target })
    let id
    if (!row) {
      do {
        id = fn.nonce(6)
      } while (this.db.get('pub', { id }))
      this.db.insert('pub', { id, target })
    } else {
      id = row.id
    }
    return `${this.url}/pub/${id}`
  }

  widgetUrl(/** @type string */ type, /** @type string */ token) {
    return `${this.url}/widget/${type}/${token}/`
  }

  async listen() {
    const port = this.port
    const hostname = this.hostname
    const app = express()


    app.get('/pub/:id', (req, res, next) => {
      const row = this.db.get('pub', {
        id: req.params.id,
      })
      if (row && row.target) {
        req.url = row.target
        req.app.handle(req, res)
        return
      }
      res.status(404).send()
    })

    const uploadDir = './data/uploads'
    const storage = multer.diskStorage({
      destination: uploadDir,
      filename: function (req, file, cb) {
        cb(null, `${fn.nonce(6)}-${file.originalname}`);
      }
    })

    const upload = multer({ storage }).single('file');

    const verifyTwitchSignature = (req, res, next) => {
      const body = Buffer.from(req.rawBody, 'utf8')
      const msg = `${req.headers['twitch-eventsub-message-id']}${req.headers['twitch-eventsub-message-timestamp']}${body}`
      const hmac = crypto.createHmac('sha256', this.twitchWebhookSecret)
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

    const requireLoginApi = (req, res, next) => {
      if (!req.token) {
        res.status(401).send({})
        return
      }
      return next()
    }

    const requireLogin = (req, res, next) => {
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
    app.use('/uploads', express.static(uploadDir))
    app.use('/', express.static('./build/public'))
    app.use('/static', express.static('./public/static'))


    app.get('/api/conf', async (req, res) => {
      res.send({
        wsBase: this.wss.connectstring(),
      })
    })

    app.get('/api/user/me', requireLoginApi, async (req, res) => {
      res.send({
        user: req.user,
        widgetToken: req.userWidgetToken,
        pubToken: req.userPubToken,
        token: req.cookies['x-token'],
      })
    })

    app.post('/api/logout', async (req, res) => {
      if (req.token) {
        this.auth.destroyToken(req.token)
        res.clearCookie("x-token")
      }
      res.send({ success: true })
    })

    app.get('/api/page/index', requireLoginApi, async (req, res) => {
      res.send({
        widgets: [
          {
            title: 'Song Request',
            hint: 'Browser source, or open in browser and capture window',
            url: this.widgetUrl('sr', req.userWidgetToken),
          },
          {
            title: 'Media',
            hint: 'Browser source, or open in browser and capture window',
            url: this.widgetUrl('media', req.userWidgetToken),
          },
          {
            title: 'Speech-to-Text',
            hint: 'Google Chrome + window capture',
            url: this.widgetUrl('speech-to-text', req.userWidgetToken),
          },
          {
            title: 'Drawcast (Overlay)',
            hint: 'Browser source, or open in browser and capture window',
            url: this.widgetUrl('drawcast_receive', req.userWidgetToken),
          },
          {
            title: 'Drawcast (Draw)',
            hint: 'Open this to draw (or give to viewers to let them draw)',
            url: this.pubUrl(this.widgetUrl('drawcast_draw', req.userPubToken)),
          },
        ]
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
      const user = {
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
        this.eventHub.trigger('user_registration_complete', user)
        return
      }

      res.status(400).send({ reason: 'invalid_token' })
      return
    })

    app.get('/api/page/variables/', requireLoginApi, async (req, res) => {
      res.send((req, res) => {
        const variables = new Variables(this.db, req.user.id)
        return {
          variables: variables.all(),
        }
      })
    })

    app.post('/save-variables', requireLoginApi, express.json(), async (req, res) => {
      const variables = new Variables(this.db, req.user.id)
      variables.replace(req.body.variables || [])
      res.send()
    })

    app.get('/api/page/settings/', requireLoginApi, async (req, res) => {
      const user = this.userRepo.getById(req.user.id)
      user.groups = this.userRepo.getGroups(user.id)
      delete user.pass
      res.send({
        user,
        twitchChannels: this.twitchChannelRepo.allByUserId(req.user.id),
      })
    })

    app.post('/api/save-settings', requireLoginApi, express.json(), async (req, res) => {
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

      const user = {
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

      const twitch_channels = req.body.twitch_channels.map(channel => {
        channel.user_id = user.id
        return channel
      })

      this.userRepo.save(user)
      this.twitchChannelRepo.saveUserChannels(user.id, twitch_channels)

      this.eventHub.trigger('user_changed', this.userRepo.getById(user.id))
      res.send()
    })

    // twitch calls this url after auth
    // from here we render a js that reads the token and shows it to the user
    app.get('/twitch/redirect_uri', async (req, res) => {
      res.send(await fn.render('twitch/redirect_uri.twig'))
    })
    app.post('/twitch/user-id-by-name', requireLoginApi, express.json(), async (req, res) => {
      let clientId
      let clientSecret
      if (!req.user.groups.includes('admin')) {
        const u = this.userRepo.getById(req.user.id)
        clientId = u.tmi_identity_client_id || configTwitch.tmi.identity.client_id
        clientSecret = u.tmi_identity_client_secret || configTwitch.tmi.identity.client_secret
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
        const client = new TwitchHelixClient(clientId, clientSecret)
        res.send({ id: await client.getUserIdByName(req.body.name) })
      } catch (e) {
        res.status(500).send("Something went wrong!");
      }
    })

    app.post(
      '/twitch/event-sub/',
      express.json({ verify: (req, res, buf) => { req.rawBody = buf } }),
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

    app.post('/api/auth', express.json(), async (req, res) => {
      const user = this.auth.getUserByNameAndPass(req.body.user, req.body.pass)
      if (!user) {
        res.status(401).send({ reason: 'bad credentials' })
        return
      }

      const token = this.auth.getUserAuthToken(user.id)
      res.cookie('x-token', token, { maxAge: 1 * fn.YEAR, httpOnly: true })
      res.send()
    })

    app.post('/api/upload', requireLoginApi, (req, res) => {
      upload(req, res, (err) => {
        if (err) {
          log.error(err)
          res.status(400).send("Something went wrong!");
        }
        res.send(req.file)
      })
    })

    app.get('/widget/:widget_type/:widget_token/', async (req, res, next) => {
      const user = this.auth.userFromWidgetToken(req.params.widget_token)
        || this.auth.userFromPubToken(req.params.widget_token)
      if (!user) {
        res.status(404).send()
        return
      }
      const key = req.params.widget_type
      for (const m of this.moduleManager.all(user.id)) {
        const map = m.widgets()
        if (map && map[key]) {
          await map[key](req, res, next)
          return
        }
      }
      res.status(404).send()
    })

    app.all('*', requireLogin, express.json({ limit: '50mb' }), async (req, res, next) => {
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
