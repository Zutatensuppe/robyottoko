const fn = require('../fn.js')
const crypto = require('crypto')
const multer = require('multer')
const express = require('express')
const cookieParser = require('cookie-parser')

const TwitchHelixClient = require('../services/TwitchHelixClient.js')
const Db = require('../Db.js')
const Users = require('../services/Users.js')
const Tokens = require('../services/Tokens.js')
const Mail = require('../net/Mail.js')
const WebSocketServer = require('./WebSocketServer.js')
const Variables = require('../services/Variables.js')

const log = fn.logger(__filename)

class WebServer {
  constructor(
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
    app.use('/static', express.static('./public/static'))

    app.get('/login', async (req, res) => {
      if (req.token) {
        res.redirect(302, '/')
        return
      }
      res.send(await fn.render('base.twig', {
        title: 'Login',
        page: 'login',
        page_data: {
          wsBase: this.wss.connectstring(),
          widgetToken: null,
          user: null,
          token: null,
        },
      }))
    })
    app.get('/register', async (req, res) => {
      if (req.token) {
        res.redirect(302, '/')
        return
      }
      res.send(await fn.render('base.twig', {
        title: 'Register',
        page: 'register',
        page_data: {
          wsBase: this.wss.connectstring(),
          widgetToken: null,
          user: null,
          token: null,
        },
      }))
    })
    app.get('/password-reset', async (req, res) => {
      if (req.token) {
        res.redirect(302, '/')
        return
      }
      res.send(await fn.render('base.twig', {
        title: 'Password Reset',
        page: 'password-reset',
        page_data: {
          wsBase: this.wss.connectstring(),
          widgetToken: null,
          user: null,
          token: null,
        },
      }))
    })
    app.get('/forgot-password', async (req, res) => {
      if (req.token) {
        res.redirect(302, '/')
        return
      }
      res.send(await fn.render('base.twig', {
        title: 'Forgot Password',
        page: 'forgot-password',
        page_data: {
          wsBase: this.wss.connectstring(),
          widgetToken: null,
          user: null,
          token: null,
        },
      }))
    })
    app.get('/logout', async (req, res) => {
      if (req.token) {
        this.auth.destroyToken(req.token)
        res.clearCookie("x-token")
      }
      res.redirect(302, '/login')
    })

    app.get('/', requireLogin, async (req, res) => {
      const widgets = [
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
      ];
      res.send(await fn.render('base.twig', {
        title: 'Hyottoko.club',
        page: 'index',
        page_data: {
          wsBase: this.wss.connectstring(),
          widgetToken: req.userWidgetToken,
          user: req.user,
          token: req.cookies['x-token'],
          widgets,
        },
      }))
    })

    app.post('/api/user/_reset_password', express.json(), async (req, res) => {
      const pass = req.body.pass || null
      const token = req.body.token || null
      if (!pass || !token) {
        res.status(400).send({ reason: 'bad request' })
        return
      }

      const tokenObj = this.tokenRepo.getByToken(token)
      if (!tokenObj) {
        res.status(400).send({ reason: 'bad request' })
        return
      }

      this.db.upsert('user', { pass }, { id: tokenObj.user_id })
      this.tokenRepo.delete(tokenObj.token)
      res.send({ success: true })
    })

    app.post('/api/user/_request_password_reset', express.json(), async (req, res) => {
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
      const user = {
        name: req.body.user,
        pass: req.body.pass,
        email: req.body.email,

        status: 'verification_pending',

        tmi_identity_username: '',
        tmi_identity_password: '',
        tmi_identity_client_id: '',
        tmi_identity_client_secret: '',
      }
      if (this.db.get('user', { name: user.name })) {
        res.status(400).send({ reason: 'user_already_exists' })
        return
      }
      if (this.db.get('user', { email: user.email })) {
        res.status(400).send({ reason: 'user_already_exists' })
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
        this.db.upsert('user', { status: 'verified' }, { id: tokenObj.user_id })
        this.tokenRepo.delete(tokenObj.token)
        res.send({ type: 'registration-verified' })
        return
      }

      res.status(400).send({ reason: 'invalid_token' })
      return
    })


    app.get('/variables/', requireLogin, async (req, res) => {
      const variables = new Variables(this.db, req.user.id)
      res.send(await fn.render('base.twig', {
        title: 'Variables',
        page: 'variables',
        page_data: {
          user: req.user,
          variables: variables.all(),
        },
      }))
    })

    app.post('/save-variables', requireLogin, express.json(), async (req, res) => {
      const variables = new Variables(this.db, req.user.id)
      variables.replace(req.body.variables || [])
      res.send()
    })

    app.get('/settings/', requireLogin, async (req, res) => {
      const twitch_channels = this.twitchChannelRepo.allByUserId(req.user.id)
      res.send(await fn.render('base.twig', {
        title: 'Settings',
        page: 'settings',
        page_data: {
          user: req.user,
          twitch_channels,
        },
      }))
    })

    app.post('/save-settings', requireLogin, express.json(), async (req, res) => {
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
      res.send()
    })

    // twitch calls this url after auth
    // from here we render a js that reads the token and shows it to the user
    app.get('/twitch/redirect_uri', async (req, res) => {
      res.send(await fn.render('twitch/redirect_uri.twig'))
    })
    app.post('/twitch/user-id-by-name', requireLogin, express.json(), async (req, res) => {
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

    app.post('/auth', express.json(), async (req, res) => {
      const user = this.auth.getUserByNameAndPass(req.body.user, req.body.pass)
      if (!user) {
        res.status(401).send({ reason: 'bad credentials' })
        return
      }

      const token = this.auth.getUserAuthToken(user.id)
      res.cookie('x-token', token, { maxAge: 1 * fn.YEAR, httpOnly: true })
      res.send()
    })

    app.post('/upload', requireLogin, (req, res) => {
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
      res.sendStatus(404)
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

module.exports = WebServer
