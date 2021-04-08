const fn = require('../fn.js')
const multer = require('multer')
const express = require('express')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')

const TwitchHelixClient = require('../services/TwitchHelixClient.js')

const log = fn.logger(__filename)

class WebServer {
  constructor(db, moduleManager, config, auth) {
    this.db = db
    this.moduleManager = moduleManager
    this.config = config
    this.auth = auth
    this.handle = null
  }

  async listen() {
    const port = this.config.http.port
    const hostname = this.config.http.hostname
    const app = express()

    const uploadDir = './data/uploads'
    const storage = multer.diskStorage({
      destination: uploadDir,
      filename: function (req, file, cb) {
        cb(null , file.originalname);
      }
    })

    const upload = multer({storage}).single('file');

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
          wsBase: this.config.ws.connectstring,
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
          wsBase: this.config.ws.connectstring,
          widgetToken: req.userWidgetToken,
          user: req.user,
          token: req.cookies['x-token'],
        },
      }))
    })

    app.get('/settings/', requireLogin, async (req, res) => {
      const user = this.db.get('user', {id: req.user.id})
      const twitch_channels = this.db.getMany('twitch_channel', {user_id: user.id})
      res.send(await fn.render('base.twig', {
        title: 'Settings',
        page: 'settings',
        page_data: {
          user,
          twitch_channels,
        },
      }))
    })

    app.post('/save-settings', requireLogin, bodyParser.json(), async (req, res) => {
      const user = req.body.user
      user.id = req.user.id
      const twitch_channels = req.body.twitch_channels.map(channel => {
        channel.user_id = req.user.id
        return channel
      })

      this.db.upsert('user', user, {id: user.id})
      for (const twitch_channel of twitch_channels) {
        this.db.upsert('twitch_channel', twitch_channel, {
          user_id: twitch_channel.user_id,
          channel_name: twitch_channel.channel_name,
        })
      }
      res.send()
    })

    // twitch calls this url after auth
    // from here we render a js that reads the token and shows it to the user
    app.get('/twitch/redirect_uri', async (req, res) => {
      res.send(await fn.render('twitch/redirect_uri.twig'))
    })
    app.post('/twitch/user-id-by-name', requireLogin, bodyParser.json(), async (req, res) => {
      const client = new TwitchHelixClient(req.body.client_id, req.body.client_secret)
      res.send({id: await client.getUserIdByName(req.body.name)})
    })

    app.post('/auth', bodyParser.json(), async (req, res) => {
      const user = this.auth.getUserForNameAndPass(req.body.user, req.body.pass)
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
          log(err)
          res.status(400).send("Something went wrong!");
        }
        res.send(req.file)
      })
    })

    app.get('/widget/:widget_type/:widget_token/', async (req, res, next) => {
      req.user = this.auth.userFromWidgetToken(req.params.widget_token)
      const key = req.params.widget_type
      for (const m of this.moduleManager.all(req.user.id)) {
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
      () => log(`server running on http://${hostname}:${port}`)
    )
  }
  close () {
    if (this.handle) {
      this.handle.close()
    }
  }
}

module.exports = WebServer
