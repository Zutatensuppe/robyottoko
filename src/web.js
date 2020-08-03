const ws = require('ws')
const fn = require('./fn.js')
const multer = require('multer')
const express = require('express')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const { userStorage, tokenStorage } = require('./users.js')

class Auth
{
  generateToken(length) {
    //edit the token allowed characters
    const a = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890".split("");
    const b = [];
    for (let i = 0; i < length; i++) {
      const j = (Math.random() * (a.length - 1)).toFixed(0);
      b[i] = a[j];
    }
    return b.join("");
  }

  generateTokenForUser (user, type) {
    const tokens = tokenStorage.load() || {}
    const token = this.generateToken(32)
    tokens[token] = {user: user, type: type}
    tokenStorage.save(tokens)
    return token
  }

  checkUserPass (user, pass) {
    const users = userStorage.load()
    for (let u of users) {
      if (u.user === user && u.pass === pass) {
        return this.generateTokenForUser(user, 'auth')
      }
    }
    return null
  }

  getUserWidgetToken (user) {
    const tokens = tokenStorage.load()
    for (let token in tokens || {}) {
      if (!tokens.hasOwnProperty(token)) {

      }
      if (tokens[token].user === user && tokens[token].type === 'widget') {
        return token
      }
    }
    return this.generateTokenForUser(user, 'widget')
  }

  checkToken (token, type) {
    const tokens = tokenStorage.load()
    return tokens && !!tokens[token] && tokens[token].type === type
  }

  destroyToken (token) {
    const tokens = tokenStorage.load()
    if (tokens && tokens[token]) {
      delete tokens[token]
    }
    tokenStorage.save(tokens)
  }

  addAuthInfoMiddleware () {
    return (req, res, next) => {
      const token = req.cookies['x-token'] || null
      if (auth.checkToken(token, 'auth')) {
        req.token = token
        const tokens = tokenStorage.load()
        req.user = tokens[req.token].user
        req.userWidgetToken = auth.getUserWidgetToken(req.user)
      } else {
        req.token = null
        req.user = null
      }
      next()
    }
  }

  wsHandleProtocol () {
    return (protocol) => {
      if (
        protocol.length === 2
        && protocol[0] === 'x-token'
        && this.checkToken(protocol[1], 'auth')
      ) {
        return protocol[1]
      }
      if (
        protocol.length === 2
        && protocol[0] === 'x-widget-token'
        && this.checkToken(protocol[1], 'widget')
      ) {
        return protocol[1]
      }
      return new Date().getTime()
    }
  }
}

const auth = new Auth()

function webserver(moduleManager, config) {
  const port = config.http.port
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
  app.use(auth.addAuthInfoMiddleware())
  app.use('/media/sounds', express.static(uploadDir))
  app.use('/static', express.static('./data/static'))
  app.get('/login', async (req, res) => {
    if (req.token) {
      res.redirect(302, '/')
      return
    }
    res.send(await fn.render('base.twig', {
      title: 'Login',
      page: 'login',
    }))
  })
  app.get('/logout', async (req, res) => {
    if (req.token) {
      auth.destroyToken(req.token)
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
      data: {
        userWidgetToken: req.userWidgetToken
      },
      user: req.user,
      ws: config.ws,
    }))
  })

  app.post('/auth', bodyParser.json(), async (req, res) => {
    const user = req.body.user
    const pass = req.body.pass
    const token = auth.checkUserPass(user, pass)
    if (token) {
      res.send({token})
      return
    }
    res.status(401).send({reason: 'bad credentials'})
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
    console.log(req.params)
    if (auth.checkToken(req.params.widget_token, 'widget')) {
      const tokens = tokenStorage.load()
      req.user = tokens[req.params.widget_token].user
    } else {
      req.user = null
    }

    const handle = async (req, res) => {
      for (const module of await moduleManager.all(req.user)) {
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

  app.get('*', async function (req, res) {
    if (!req.token) {
      res.redirect(302, '/login')
      return
    }
    const handle = async (req, res) => {
      for (const module of await moduleManager.all(req.user)) {
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
  app.listen(port, () => console.log(`server running on port ${port}`))
}

let _websocketserver
let _interval
function websocketserver(moduleManager, conf) {
  _websocketserver = new ws.Server(Object.assign({}, conf, {
    handleProtocols: auth.wsHandleProtocol()
  }))
  _websocketserver.on('connection', socket => {

    // user for the connection:
    const tokens = tokenStorage.load()
    const token = socket.protocol
    if (!tokens[token]) {
      console.log('not found token: ', token)
      socket.close()
      return
    }
    socket.user = tokens[token].user

    socket.isAlive = true
    socket.on('pong', function () {
      this.isAlive = true;
    })
    socket.on('message', (data) => {
      console.log(`ws|${socket.user}| `, data)
      const d = JSON.parse(data)
      if (!d.event) {
        return
      }

      for (const module of moduleManager.all(socket.user)) {
        const evts = module.getWsEvents()
        if (!evts) {
          continue;
        }
        if (evts[d.event]) {
          evts[d.event](socket, d)
        }
      }
    })

    for (const module of moduleManager.all(socket.user)) {
      const evts = module.getWsEvents()
      if (!evts) {
        continue;
      }
      if (evts['conn']) {
        evts['conn'](socket)
      }
    }
  })

  _interval = setInterval(function ping() {
    _websocketserver.clients.forEach(function each(socket) {
      if (socket.isAlive === false) {
        return socket.terminate();
      }
      socket.isAlive = false;
      socket.ping(() => {
      });
    });
  }, 30000)
  _websocketserver.on('close', function close() {
    clearInterval(_interval);
  });
}

function notifyOne(users, data, socket) {
  if (socket.isAlive && users.includes(socket.user)) {
    socket.send(JSON.stringify(data))
  }
}

function notifyAll (users, data) {
  _websocketserver.clients.forEach(function each(socket) {
    notifyOne(users, data, socket)
  })
}

const init = (moduleManager, config) => {
  webserver(moduleManager, config)
  websocketserver(moduleManager, config.ws)
}

module.exports = {
  init,
  notifyOne,
  notifyAll,
}
