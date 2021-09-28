import WebSocket from 'ws'
import { SECOND, logger } from '../fn.js'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)

const log = logger(__filename)

class WebSocketServer {
  constructor(
    moduleManager,
    config,
    auth,
  ) {
    this.moduleManager = moduleManager
    this.config = config
    this.auth = auth
    this._websocketserver = null
    this._interval = null
  }

  connectstring() {
    return this.config.connectstring
  }

  listen() {
    this._websocketserver = new WebSocket.Server(this.config)
    this._websocketserver.on('connection', (socket, request, client) => {
      const token = socket.protocol
      const tokenInfo = this.auth.wsTokenFromProtocol(token)
      if (!tokenInfo) {
        log.info('not found token: ', token)
        socket.close()
        return
      }

      socket.user_id = tokenInfo.user_id

      const pathname = new URL(this.connectstring()).pathname
      if (request.url.indexOf(pathname) !== 0) {
        log.info('bad request url: ', request.url)
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
        socket.module = module.name

        const evts = module.getWsEvents()
        if (evts) {
          socket.on('message', (data) => {
            log.info(`ws|${socket.user_id}| `, data)
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
        socket.ping(() => { })
      })
    }, 30 * SECOND)

    this._websocketserver.on('close', () => {
      clearInterval(this._interval)
    })
  }

  notifyOne(user_ids, module, data, /** @type WebSocket */ socket) {
    if (socket.isAlive && user_ids.includes(socket.user_id) && socket.module === module) {
      log.info(`notifying ${socket.user_id} (${data.event})`)
      socket.send(JSON.stringify(data))
    }
  }

  notifyAll(user_ids, module, data) {
    this._websocketserver.clients.forEach((socket) => {
      this.notifyOne(user_ids, module, data, socket)
    })
  }

  close() {
    if (this._websocketserver) {
      this._websocketserver.close()
    }
  }
}

export default WebSocketServer
