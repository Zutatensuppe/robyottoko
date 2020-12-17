const fn = require('../fn.js')
const multer = require('multer')
const express = require('express')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')

const Millisecond = 1
const Second = 1000 * Millisecond
const Minute = 60 * Second
const Hour = 60 * Minute
const Day = 24 * Hour
const Year = 356 * Day

class WebServer {
  constructor(moduleManager, config, auth) {
    this.moduleManager = moduleManager
    this.config = config
    this.auth = auth
    this.handle = null
  }

  listen() {
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
        ws: this.config.ws,
        widget_token: null,
        user: null,
        token: null,
      }))
    })
    app.get('/logout', async (req, res) => {
      if (req.token) {
        this.auth.destroyToken(req.token)
        res.clearCookie("x-token")
      }
      res.redirect(302, '/login')
    })

    app.get('/', async (req, res) => {
      if (!req.token) {
        res.redirect(302, '/login')
        return
      }
      res.send(await fn.render('base.twig', {
        title: 'Hyottoko.club',
        page: 'index',
        widget_token: req.userWidgetToken,
        user: req.user,
        token: req.cookies['x-token'],
        ws: this.config.ws,
      }))
    })

    app.post('/auth', bodyParser.json(), async (req, res) => {
      const user = this.auth.getUserForNameAndPass(req.body.user, req.body.pass)
      if (!user) {
        res.status(401).send({reason: 'bad credentials'})
        return
      }

      const token = this.auth.getUserAuthToken(user.id)
      res.cookie('x-token', token, { maxAge: Year, httpOnly: true })
      res.send()
    })
    app.post('/upload', (req, res) => {
      if (!req.token) {
        res.status(401).send('not allowed')
        return
      }
      upload(req, res, (err) => {
        if (err) {
          console.log(err)
          res.status(400).send("Something went wrong!");
        }
        res.send(req.file)
      })
    })

    app.get('/widget/:widget_type/:widget_token/', async (req, res) => {
      req.user = this.auth.userFromWidgetToken(req.params.widget_token)

      const handle = async (req, res) => {
        for (const module of this.moduleManager.all(req.user.id)) {
          const widgets = module.widgets()
          if (!widgets) {
            continue;
          }
          if (widgets[req.params.widget_type]) {
            return await widgets[req.params.widget_type](req, res)
          }
        }
      }
      const {code, type, body} = await handle(req, res) || {
        code: 404,
        type: 'text/plain',
        body: '404 Not Found'
      }

      res.statusCode = code
      res.setHeader('Content-Type', type)
      res.end(body)
    })

    app.get('*', async (req, res) => {
      if (!req.token) {
        res.redirect(302, '/login')
        return
      }
      const handle = async (req, res) => {
        for (const module of this.moduleManager.all(req.user.id)) {
          const routes = module.getRoutes()
          if (!routes) {
            continue;
          }
          if (routes[req.url]) {
            return await routes[req.url](req, res)
          }
        }
      }
      const {code, type, body} = await handle(req, res) || {
        code: 404,
        type: 'text/plain',
        body: '404 Not Found'
      }

      res.statusCode = code
      res.setHeader('Content-Type', type)
      res.end(body)
    })
    this.handle = app.listen(port, hostname, () => console.log(`server running on http://${hostname}:${port}`))
  }
  close () {
    if (this.handle) {
      this.handle.close()
    }
  }
}

module.exports = WebServer
