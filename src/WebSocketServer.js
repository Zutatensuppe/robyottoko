const ws = require('ws')

class WebSocketServer {
  constructor(moduleManager, config, auth) {
    this.moduleManager = moduleManager
    this.config = config
    this.auth = auth
    this._websocketserver = null
    this._interval = null
  }

  listen () {
    this._websocketserver = new ws.Server(Object.assign({}, this.config, {
      handleProtocols: this.auth.wsHandleProtocol()
    }))
    this._websocketserver.on('connection', socket => {

      // user for the connection:
      const token = socket.protocol
      const tokenInfo = this.auth.getTokenInfo(token)
      if (!tokenInfo) {
        console.log('not found token: ', token)
        socket.close()
        return
      }
      socket.user_id = tokenInfo.user_id

      socket.isAlive = true
      socket.on('pong', function () {
        this.isAlive = true;
      })
      socket.on('message', (data) => {
        console.log(`ws|${socket.user_id}| `, data)
        const d = JSON.parse(data)
        if (!d.event) {
          return
        }

        for (const module of this.moduleManager.all(socket.user_id)) {
          const evts = module.getWsEvents()
          if (!evts) {
            continue;
          }
          if (evts[d.event]) {
            evts[d.event](socket, d)
          }
        }
      })

      for (const module of this.moduleManager.all(socket.user_id)) {
        const evts = module.getWsEvents()
        if (!evts) {
          continue;
        }
        if (evts['conn']) {
          evts['conn'](socket)
        }
      }
    })

    this._interval = setInterval(() => {
      this._websocketserver.clients.forEach((socket) => {
        if (socket.isAlive === false) {
          return socket.terminate()
        }
        socket.isAlive = false
        socket.ping(() => {
        })
      })
    }, 30000)

    this._websocketserver.on('close', () => {
      clearInterval(this._interval)
    })
  }

  notifyOne(user_ids, data, socket) {
    if (socket.isAlive && user_ids.includes(socket.user_id)) {
      socket.send(JSON.stringify(data))
    }
  }

  notifyAll (user_ids, data) {
    this._websocketserver.clients.forEach((socket) => {
      this.notifyOne(user_ids, data, socket)
    })
  }
}

module.exports = {
  WebSocketServer,
}