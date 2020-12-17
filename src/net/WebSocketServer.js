const WebSocket = require('ws')

class WebSocketServer {
  constructor(moduleManager, config, auth) {
    this.moduleManager = moduleManager
    this.config = config
    this.auth = auth
    this._websocketserver = null
    this._interval = null
  }

  listen () {
    this._websocketserver = new WebSocket.Server(this.config)
    this._websocketserver.on('connection', (socket, request, client) => {
      const token = socket.protocol
      const tokenInfo = this.auth.wsTokenFromProtocol(token)
      if (!tokenInfo) {
        console.log('not found token: ', token)
        socket.close()
        return
      }

      socket.user_id = tokenInfo.user_id

      const pathname = new URL(this.config.connectstring).pathname
      if (request.url.indexOf(pathname) !== 0) {
        console.log('bad request url: ', request.url)
        socket.close()
        return
      }

      socket.isAlive = true
      socket.on('pong', function () {
        this.isAlive = true;
      })

      const relpath = request.url.substr(pathname.length)
      // module routing
      for (const module of this.moduleManager.all(socket.user_id)) {
        if ('/' + module.name !== relpath) {
          continue
        }

        const evts = module.getWsEvents()
        if (evts) {
          socket.on('message', (data) => {
            console.log(`ws|${socket.user_id}| `, data)
            const d = JSON.parse(data)
            if (!d.event) {
              return
            }

            if (evts[d.event]) {
              evts[d.event](socket, d)
            }
          })

          if (evts['conn']) {
            evts['conn'](socket)
          }
        }
      }
    })

    this._interval = setInterval(() => {
      this._websocketserver.clients.forEach((socket) => {
        if (socket.isAlive === false) {
          return socket.terminate()
        }
        socket.isAlive = false
        socket.ping(() => {})
      })
    }, 30000)

    this._websocketserver.on('close', () => {
      clearInterval(this._interval)
    })
  }

  notifyOne(user_ids, data, socket) {
    if (socket.isAlive && user_ids.includes(socket.user_id)) {
      console.log(`notifying ${socket.user_id} (${data.event})`)
      socket.send(JSON.stringify(data))
    }
  }

  notifyAll (user_ids, data) {
    this._websocketserver.clients.forEach((socket) => {
      this.notifyOne(user_ids, data, socket)
    })
  }

  close () {
    if (this._websocketserver) {
      this._websocketserver.close()
    }
  }
}

module.exports = WebSocketServer
