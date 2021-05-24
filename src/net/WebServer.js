const fn = require('../fn.js')
const crypto = require('crypto')
const multer = require('multer')
const express = require('express')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')

const TwitchHelixClient = require('../services/TwitchHelixClient.js')

const log = fn.logger(__filename)

class WebServer {
  constructor(db, userRepo, twitchChannelRepo, moduleManager, configHttp, configTwitch, wss, auth) {
    this.db = db
    this.userRepo = userRepo
    this.twitchChannelRepo = twitchChannelRepo

    this.moduleManager = moduleManager
    this.port = configHttp.port
    this.hostname = configHttp.hostname
    this.twitchWebhookSecret = configTwitch.eventSub.transport.secret
    this.wss = wss
    this.auth = auth
    this.handle = null
  }

  async listen() {
    const port = this.port
    const hostname = this.hostname
    const app = express()

    const uploadDir = './data/uploads'
    const storage = multer.diskStorage({
      destination: uploadDir,
      filename: function (req, file, cb) {
        cb(null , file.originalname);
      }
    })

    const upload = multer({storage}).single('file');

    const verifyTwitchSignature = (req, res, next) => {
      const body = Buffer.from(req.rawBody, 'utf8')
      const msg = `${req.headers['twitch-eventsub-message-id']}${req.headers['twitch-eventsub-message-timestamp']}${body}`
      const hmac = crypto.createHmac('sha256', this.twitchWebhookSecret)
      hmac.update(msg)
      const expected = `sha256=${hmac.digest('hex')}`
      if (req.headers['twitch-eventsub-message-signature'] !== expected) {
        log.error('unexpected message signature', req, expected)
        res.status(403)
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
    app.get('/logout', async (req, res) => {
      if (req.token) {
        this.auth.destroyToken(req.token)
        res.clearCookie("x-token")
      }
      res.redirect(302, '/login')
    })

    app.get('/', requireLogin, async (req, res) => {
      res.send(await fn.render('base.twig', {
        title: 'Hyottoko.club',
        page: 'index',
        page_data: {
          wsBase: this.wss.connectstring(),
          widgetToken: req.userWidgetToken,
          user: req.user,
          token: req.cookies['x-token'],
        },
      }))
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

    app.post('/save-settings', requireLogin, bodyParser.json(), async (req, res) => {
      if (!req.user.groups.includes('admin')) {
        if (req.user.id !== req.body.user.id) {
          // editing other user than self
          res.status(401)
          return
        }
      }

      const user = {
        id: req.body.user.id,
        pass: req.body.user.pass,
      }
      if (req.user.groups.includes('admin')) {
        user.tmi_identity_client_id = req.body.user.tmi_identity_client_id
        user.tmi_identity_client_secret = req.body.user.tmi_identity_client_secret
        user.tmi_identity_username = req.body.user.tmi_identity_username
        user.tmi_identity_password = req.body.user.tmi_identity_password
      }

      this.userRepo.save(user)

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
    app.post('/twitch/user-id-by-name', requireLogin, bodyParser.json(), async (req, res) => {
      let clientId
      let clientSecret
      if (!req.user.groups.includes('admin')) {
        const u = this.userRepo.getById(req.user.id)
        clientId = u.tmi_identity_client_id
        clientSecret = u.tmi_identity_client_secret
      } else {
        clientId = req.body.client_id
        clientSecret = req.body.client_secret
      }
      if (!clientId) {
        res.status(400).send({reason: 'need client id'});
        return
      }
      if (!clientSecret) {
        res.status(400).send({reason: 'need client secret'});
        return
      }

      try {
        const client = new TwitchHelixClient(clientId, clientSecret)
        res.send({id: await client.getUserIdByName(req.body.name)})
      } catch (e) {
        res.status(500).send("Something went wrong!");
      }
    })

    app.post(
      '/twitch/event-sub/',
      bodyParser.json({ verify: (req,res,buf) => { req.rawBody=buf }}),
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

      res.status(400)
    })

    app.post('/auth', bodyParser.json(), async (req, res) => {
      const user = this.auth.getUserByNameAndPass(req.body.user, req.body.pass)
      if (!user) {
        res.status(401).send({reason: 'bad credentials'})
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
      const key = req.params.widget_type
      for (const m of this.moduleManager.all(user.id)) {
        const map = m.widgets()
        if (map && map[key]) {
          await map[key](req, res, next)
          return
        }
      }
      res.sendStatus(404)
    })

    app.get('*', requireLogin, async (req, res, next) => {
      const key = req.url
      for (const m of this.moduleManager.all(req.user.id)) {
        const map = m.getRoutes()
        if (map && map[key]) {
          await map[key](req, res, next)
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
  close () {
    if (this.handle) {
      this.handle.close()
    }
  }
}

module.exports = WebServer
